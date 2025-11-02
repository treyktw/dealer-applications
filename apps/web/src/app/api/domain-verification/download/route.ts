import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return new Response('Missing token', { status: 400 });
  }
  
  // Return file with token as content
  return new Response(token, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="uab-verify.txt"',
    },
  });
}