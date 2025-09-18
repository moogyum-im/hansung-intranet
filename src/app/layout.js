// 파일 경로: src/app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HANSUNG 인트라넷',
  description: '한성 인트라넷 시스템',
  
  // [수정] icons 객체를 삭제했습니다. 
  // Next.js가 /app 폴더의 icon.png, apple-icon.png 파일을 자동으로 인식합니다.

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
      <head>
        {/* PWA를 위한 manifest 파일 링크는 그대로 유지합니다. */}
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}