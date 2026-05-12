// src/app/api/link-preview/route.js
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return Response.json({ error: 'URL required' }, { status: 400 });

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HansungBot/1.0)' }
        });
        clearTimeout(timeout);
        const html = await res.text();

        const getMeta = (prop) => {
            return (
                html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ||
                html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${prop}["']`, 'i'))?.[1] ||
                html.match(new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ||
                null
            );
        };
        const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];

        return Response.json({
            title:       getMeta('title')       || titleTag || url,
            description: getMeta('description') || null,
            image:       getMeta('image')        || null,
            siteName:    getMeta('site_name')    || null,
            url,
        });
    } catch {
        return Response.json({ title: url, url });
    }
}