import { NextRequest, NextResponse } from 'next/server';

const API_PREFIX = '/api/v1';
const BACKEND_BASE_URLS = [
  process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000',
  'http://localhost:8000',
].map((value) => value.replace(/\/$/, ''));
const SESSION_COOKIE = 'globus_session';
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'cookie',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

async function proxyRequest(request: NextRequest, path: string[]) {
  const targetPath = path.join('/');
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstreamResponse: Response | null = null;
  for (const baseUrl of BACKEND_BASE_URLS) {
    const targetUrl = new URL(`${baseUrl}${API_PREFIX}/${targetPath}`);
    targetUrl.search = request.nextUrl.search;
    try {
      upstreamResponse = await fetch(targetUrl, init);
      break;
    } catch {
      continue;
    }
  }

  if (!upstreamResponse) {
    return NextResponse.json(
      {
        detail: 'Backend is temporarily unavailable',
      },
      { status: 503 },
    );
  }
  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
