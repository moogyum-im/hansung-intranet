import { NextResponse } from 'next/server';

export async function GET() {
  // 이 API가 호출되면 성공 메시지를 반환합니다.
  return NextResponse.json({ message: 'API test successful!' });
}