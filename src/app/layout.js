// 파일 경로: src/app/layout.js
import './globals.css';
import { EmployeeProvider } from '@/contexts/EmployeeContext'; // 이 import 문 확인!
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'HANSUNG 인트라넷',
  description: '한성 인트라넷 시스템',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* <EmployeeProvider> 로 children을 감싸고 있는지 확인! */}
        <EmployeeProvider>
          {children}
        </EmployeeProvider>
      </body>
    </html>
  );
}