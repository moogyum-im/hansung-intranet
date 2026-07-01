import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function decrypt(encryptedText: string): Promise<string> {
  const keyHex = Deno.env.get('ENCRYPTION_KEY')!;
  const [ivHex, encHex] = encryptedText.split(':');
  const cryptoKey = await crypto.subtle.importKey(
    'raw', hexToBytes(keyHex), { name: 'AES-CBC' }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: hexToBytes(ivHex) },
    cryptoKey,
    hexToBytes(encHex)
  );
  return new TextDecoder().decode(decrypted);
}

// 버퍼드 POP3 리더
class Pop3Reader {
  private conn: Deno.TlsConn;
  private buf = '';
  private dec = new TextDecoder();
  private enc = new TextEncoder();

  constructor(conn: Deno.TlsConn) {
    this.conn = conn;
  }

  async readLine(): Promise<string> {
    while (!this.buf.includes('\r\n')) {
      const chunk = new Uint8Array(4096);
      const n = await this.conn.read(chunk);
      if (n === null) break;
      this.buf += this.dec.decode(chunk.slice(0, n));
    }
    const idx = this.buf.indexOf('\r\n');
    if (idx === -1) return this.buf;
    const line = this.buf.slice(0, idx);
    this.buf = this.buf.slice(idx + 2);
    return line;
  }

  async readUntilDot(): Promise<string> {
    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      if (line === '.') break;
      lines.push(line.startsWith('..') ? line.slice(1) : line);
    }
    return lines.join('\r\n');
  }

  async send(cmd: string): Promise<string> {
    await this.conn.write(this.enc.encode(cmd + '\r\n'));
    return this.readLine();
  }

  close() {
    try { this.conn.close(); } catch { /* ignore */ }
  }
}

function decodeHeader(str: string): string {
  if (!str) return '';
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_: string, charset: string, encoding: string, text: string) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return new TextDecoder(charset.toLowerCase().replace('ks_c_5601-1987', 'euc-kr'))
          .decode(Uint8Array.from(atob(text), c => c.charCodeAt(0)));
      }
      return text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m: string, h: string) =>
        String.fromCharCode(parseInt(h, 16))
      );
    } catch { return text; }
  });
}

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  let current: string | null = null;
  for (const line of lines) {
    if (line === '') break;
    if (/^\s/.test(line) && current) {
      headers[current] += ' ' + line.trim();
    } else {
      const m = line.match(/^([^:]+):\s*(.*)/);
      if (m) { current = m[1].toLowerCase(); headers[current] = m[2].trim(); }
    }
  }
  return headers;
}

function parseFrom(from: string): string {
  if (!from) return '';
  const decoded = decodeHeader(from);
  const match = decoded.match(/^(.+?)\s*<[^>]+>/);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : decoded.trim();
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();

    // 자격증명 검증 전용 모드
    if (body.verifyOnly) {
      const { email, password } = body;
      const conn = await Deno.connectTls({ hostname: 'pop3s.hiworks.com', port: 995 });
      const pop3 = new Pop3Reader(conn);
      await pop3.readLine();
      const userResp = await pop3.send(`USER ${email}`);
      if (!userResp.startsWith('+OK')) {
        pop3.close();
        return new Response(JSON.stringify({ ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' }), { headers: corsHeaders });
      }
      const passResp = await pop3.send(`PASS ${password}`);
      pop3.close();
      if (!passResp.startsWith('+OK')) {
        return new Response(JSON.stringify({ ok: false, error: '비밀번호가 올바르지 않습니다. POP3 활성화 여부도 확인해주세요.' }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const { userId } = body;
    if (!userId) return new Response(JSON.stringify({ notConnected: true }), { headers: corsHeaders });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('hiworks_email, hiworks_password_enc')
      .eq('id', userId)
      .single();

    if (!profile?.hiworks_email || !profile?.hiworks_password_enc) {
      return new Response(JSON.stringify({ notConnected: true }), { headers: corsHeaders });
    }

    const password = await decrypt(profile.hiworks_password_enc);

    const conn = await Deno.connectTls({
      hostname: 'pop3s.hiworks.com',
      port: 995,
    });

    const pop3 = new Pop3Reader(conn);

    // greeting
    await pop3.readLine();

    const userResp = await pop3.send(`USER ${profile.hiworks_email}`);
    if (!userResp.startsWith('+OK')) {
      pop3.close();
      return new Response(JSON.stringify({ connected: true, fetchError: true, authFailed: true, mails: [], unreadCount: 0 }), { headers: corsHeaders });
    }

    const passResp = await pop3.send(`PASS ${password}`);
    if (!passResp.startsWith('+OK')) {
      pop3.close();
      return new Response(JSON.stringify({ connected: true, fetchError: true, authFailed: true, mails: [], unreadCount: 0 }), { headers: corsHeaders });
    }

    const statResp = await pop3.send('STAT');
    const parts = statResp.split(' ');
    const total = parseInt(parts[1]) || 0;

    const mails = [];

    if (total > 0) {
      // 최근 10개만
      const start = Math.max(1, total - 9);
      const nums = Array.from({ length: total - start + 1 }, (_, i) => total - i);

      for (const msgNum of nums) {
        try {
          const topResp = await pop3.send(`TOP ${msgNum} 0`);
          if (!topResp.startsWith('+OK')) continue;
          const headerRaw = await pop3.readUntilDot();
          const headers = parseHeaders(headerRaw);
          const dateStr = headers.date
            ? new Date(headers.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
            : '';
          mails.push({
            id: msgNum,
            subject: decodeHeader(headers.subject) || '(제목 없음)',
            from: parseFrom(headers.from),
            date: dateStr,
          });
        } catch { /* skip */ }
      }
    }

    await pop3.send('QUIT');
    pop3.close();

    return new Response(
      JSON.stringify({ connected: true, mails, unreadCount: total }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge Function POP3 오류:', err?.message);
    return new Response(
      JSON.stringify({ connected: true, fetchError: true, debugError: err?.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
