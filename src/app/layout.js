// 파일 경로: src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HANSUNG 인트라넷',
  description: '한성 인트라넷 시스템',
  // [수정] 아이콘(파비콘) 경로를 추가합니다.
  // public 폴더에 있는 favicon.ico 파일을 기본 아이콘으로 사용합니다.
  icons: {
    icon: '/favicon.ico',
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