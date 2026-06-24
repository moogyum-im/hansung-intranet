import { NextResponse } from 'next/server';

const NEWS_CACHE_DURATION = 60 * 60 * 1000; // 1시간 캐시
let newsCache = { data: null, timestamp: 0 };

// 네이버 뉴스 검색 API
async function fetchNaverNews() {
    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    const queries = ['조경공사', '수목 식재', '조경수 단가'];
    const allItems = [];
    const seen = new Set();

    for (const query of queries) {
        try {
            const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=10&sort=date`;
            const res = await fetch(url, {
                headers: {
                    'X-Naver-Client-Id':     clientId,
                    'X-Naver-Client-Secret': clientSecret,
                },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) continue;
            const json = await res.json();
            for (const item of (json.items || [])) {
                const title = item.title?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
                if (title && !seen.has(title)) {
                    seen.add(title);
                    allItems.push({
                        title,
                        link:    item.link || item.originallink || '#',
                        pubDate: item.pubDate || '',
                        source:  item.description?.replace(/<[^>]+>/g, '').slice(0, 30) || '네이버 뉴스',
                    });
                }
            }
        } catch { /* 개별 쿼리 실패 무시 */ }
    }
    return allItems.length > 0 ? allItems : null;
}

// Google News RSS 폴백
function parseRSSItems(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXml = match[1];
        const titleMatch   = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch    = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        if (titleMatch) {
            const title = titleMatch[1]
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
            items.push({
                title,
                link:    linkMatch?.[1]?.trim() || '#',
                pubDate: pubDateMatch?.[1]?.trim() || '',
                source:  '구글 뉴스',
            });
        }
    }
    return items;
}

async function fetchGoogleNews() {
    const queries = ['조경공사 시공', '수목 식재 현장', '조경수 단가 시장'];
    const allItems = [];
    const seen = new Set();

    for (const query of queries) {
        try {
            const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept':          'application/rss+xml, application/xml, text/xml, */*',
                    'Accept-Language': 'ko-KR,ko;q=0.9',
                },
                signal: AbortSignal.timeout(8000),
                next:   { revalidate: 3600 },
            });
            if (!res.ok) continue;
            const xml   = await res.text();
            const items = parseRSSItems(xml);
            for (const item of items) {
                if (!seen.has(item.title)) {
                    seen.add(item.title);
                    allItems.push(item);
                }
            }
        } catch { /* 개별 쿼리 실패 무시 */ }
    }
    return allItems.length > 0 ? allItems : null;
}

export async function GET() {
    if (newsCache.data && Date.now() - newsCache.timestamp < NEWS_CACHE_DURATION) {
        return NextResponse.json({ news: newsCache.data, cached: true });
    }

    // 1순위: 네이버 API
    let items = await fetchNaverNews();

    // 2순위: Google News RSS
    if (!items) {
        items = await fetchGoogleNews();
    }

    if (!items) {
        return NextResponse.json({ news: [], cached: false });
    }

    // 최신순 정렬, 상위 15개
    items.sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate) : new Date(0);
        const db = b.pubDate ? new Date(b.pubDate) : new Date(0);
        return db - da;
    });

    const result = items.slice(0, 15);
    newsCache = { data: result, timestamp: Date.now() };

    return NextResponse.json({ news: result, cached: false });
}
