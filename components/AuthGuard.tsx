'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRequireAuth } from '../lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useRequireAuth();

  useEffect(() => {
    if (state === 'unauthenticated') {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [state, pathname, router]);

  if (state !== 'authed') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[color:var(--muted)]">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
          Checking your session…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
