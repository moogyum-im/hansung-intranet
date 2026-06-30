import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) throw new Error('ENCRYPTION_KEY가 올바르지 않습니다 (32바이트 hex 필요)');
    return Buffer.from(key, 'hex');
}

export function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(encryptedText) {
    const [ivHex, encHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
