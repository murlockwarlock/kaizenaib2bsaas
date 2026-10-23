'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureUtmAttributionFromSearch } from '@/lib/utm';

export default function UTMTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        captureUtmAttributionFromSearch(searchParams, pathname);
    }, [pathname, searchParams]);

    return null;
}
