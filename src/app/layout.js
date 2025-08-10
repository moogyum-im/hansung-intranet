// 파일 경로: src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers'; // 방금 만든 providers를 가져옵니다.

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HANSUNG 인트라넷',
  description: '한성 인트라넷 시스템',
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
        <Providers> {/* EmployeeProvider 대신 Providers로 감싸줍니다. */}
          {children}
        </Providers>
      </body>
    </html>
  );
}