/** @type {import('next').NextConfig} */

// PWA 설정을 위한 라이브러리를 불러옵니다.
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // --- [추가] 우리가 만든 커스텀 워커 파일을 PWA 설정에 등록합니다. ---
  swSrc: 'public/worker.js', 
});

// 기존 Next.js 설정을 이곳에 유지합니다.
const nextConfig = {
  // --- 기존 이미지 설정을 여기에 그대로 유지합니다 ---
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
  // reactStrictMode: true, // 필요하다면 이 줄의 주석을 해제하세요.
};

// PWA 설정을 Next.js 설정에 합쳐서 내보냅니다.
module.exports = withPWA(nextConfig);