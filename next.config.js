/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dzouudutnlgaolzlsfzb.supabase.co',
        port: '',
        // ★★★★★ 수정된 부분 ★★★★★
        pathname: '/storage/v1/object/public/chat-files/**',
      },
    ],
  },
};

module.exports = nextConfig;