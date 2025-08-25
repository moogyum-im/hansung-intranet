// 파일 경로: src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HANSUNG 인트라넷',
  description: '한성 인트라넷 시스템',
  
  // [수정] 아이콘 설정을 모든 기기에 대응하도록 매우 구체적으로 변경합니다.
  // 이렇게 하면 Next.js의 다른 자동 파일 규칙을 무시하고 이 설정을 우선하게 됩니다.
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180' },
    ],
  },

  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
