import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const revisionPath = resolve(process.cwd(), '..', 'REVISION');
  const buildSha = await readFile(revisionPath, 'utf8').catch(() => 'unknown');
  const backendUrl = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  try {
    const backendResponse = await fetch(`${backendUrl}/health`, { cache: 'no-store' });
    const backendHealth = await backendResponse.json().catch(() => null);
    if (!backendResponse.ok || backendHealth?.status !== 'ok') {
      return NextResponse.json(
        { status: 'error', frontend: 'ok', backend: 'error', build_sha: buildSha.trim() },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: 'ok',
      frontend: 'ok',
      backend: backendHealth,
      build_sha: buildSha.trim(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', frontend: 'ok', backend: 'unavailable', build_sha: buildSha.trim() },
      { status: 503 },
    );
  }
}
