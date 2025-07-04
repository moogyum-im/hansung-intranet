// 파일 경로: tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  // content 경로를 더 명확하고 넓은 범위로 수정합니다.
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}', // contexts 폴더도 추가
  ],
  theme: {
    extend: {
      // 여기에 프로젝트에서 사용하는 커스텀 스타일을 추가할 수 있습니다.
      // 예: 애니메이션, 색상 등
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};