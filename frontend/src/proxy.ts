import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default intlMiddleware;

export const config = {
    // Match only internationalized pathnames
    // Skip all internal paths (_next, etc.) and API routes (handled by next.config.ts rewrites)
    matcher: ['/', '/(ru|en)/:path*', '/((?!api|_next|.*\\..*).*)']}
;
