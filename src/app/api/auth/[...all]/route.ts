import { auth } from '@/lib/better-auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';
import { checkIpRateLimit, checkEmailRateLimit } from '@/lib/rate-limit';

const handler = toNextJsHandler(auth);

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

const RATE_LIMITED_PATHS = [
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/request-password-reset',
];

async function withRateLimit(request: NextRequest, handle: (req: NextRequest) => Promise<Response>): Promise<Response> {
  const path = new URL(request.url).pathname;

  // Only rate-limit sensitive auth endpoints
  if (!RATE_LIMITED_PATHS.some((p) => path.startsWith(p))) {
    return handle(request);
  }

  const ip = getClientIp(request);

  // Check IP rate limit
  const ipCheck = checkIpRateLimit(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { message: 'Trop de tentatives. Veuillez réessayer plus tard.' },
      {
        status: 429,
        headers: { 'Retry-After': String(ipCheck.retryAfterSeconds) },
      }
    );
  }

  // For sign-in, also check email rate limit
  if (path.startsWith('/api/auth/sign-in') || path.startsWith('/api/auth/request-password-reset')) {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      const email = body?.email;
      if (email && typeof email === 'string') {
        const emailCheck = checkEmailRateLimit(email);
        if (!emailCheck.allowed) {
          return NextResponse.json(
            { message: 'Compte temporairement verrouillé suite à trop de tentatives. Veuillez réessayer plus tard.' },
            {
              status: 429,
              headers: { 'Retry-After': String(emailCheck.retryAfterSeconds) },
            }
          );
        }
      }
    } catch {
      // If body parsing fails, continue with normal handling
    }
  }

  return handle(request);
}

export async function GET(request: NextRequest) {
  return handler.GET!(request);
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, (req) => handler.POST!(req));
}
