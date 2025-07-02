// src/app/layout.js (올바른 코드)
import './globals.css'; 
import { Inter } from 'next/font/google'; 

const inter = Inter({ subsets: ['latin'] }); 

export const metadata = {
  title: 'HANSUNG Intranet', 
  description: 'HANSUNG Company Internal Portal for Employees',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}