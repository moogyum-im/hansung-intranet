/** @type {import('next').NextConfig} */

// --- [수정] 라이브러리 경로를 새로운 것으로 변경 ---
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dzouudutnlgaolzlsfzb.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/chat-files/**',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);