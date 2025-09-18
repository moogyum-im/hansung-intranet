/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // --- [추가] 커스텀 워커를 다시 등록합니다. ---
  swSrc: 'public/worker.js', 
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