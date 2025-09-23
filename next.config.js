/** @type {import('next').NextConfig} */

import nextPWA from '@ducanh2912/next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // --- [추가] 런타임 캐싱 기능을 비활성화하여 데이터 로딩 충돌을 방지합니다. ---
  runtimeCaching: [],
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

export default withPWA(nextConfig);