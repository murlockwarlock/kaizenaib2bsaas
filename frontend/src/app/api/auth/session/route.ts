import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'globus_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const buildCookieOptions = () => ({
  httpOnly: true,
  maxAge: SESSION_MAX_AGE,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json({ detail: 'Token is required' }, { status: 400 });
  }

  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set(SESSION_COOKIE, token, buildCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'ok' });
  response.cookies.set(SESSION_COOKIE, '', {
    ...buildCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
