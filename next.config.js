/** @type {import('next').NextConfig} */

// --- [수정] require 대신 import 구문으로 변경 ---
import nextPWA from '@ducanh2912/next-pwa';

const withPWA = nextPWA({
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

// --- [수정] export 방식 변경 ---
export default withPWA(nextConfig);