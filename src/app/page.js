// 파일 경로: src/app/page.js (루트 페이지)
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login'); // 사용자가 루트 페이지로 접속하면 자동으로 로그인 페이지로 리다이렉트합니다.
}