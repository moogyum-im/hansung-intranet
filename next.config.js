/** @type {import('next').NextConfig} */

import nextPWA from '@ducanh2912/next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // SW 캐싱 비활성화 - 구형 UI 캐시 문제 방지
  cleanupOutdatedCaches: true,
  runtimeCaching: [],
});

const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0, // 라우터 캐시(5분 stale) 비활성화 - 배포 직후 클라이언트 이동 시 구버전 노출 방지
    },
  },
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
  async headers() {
    return [
      {
        // _next/static, _next/image, favicon 제외 - 나머지 페이지는 항상 최신 버전을 받도록 강제
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);