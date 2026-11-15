'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

const LINKS = [
  ['/dashboard', 'Wallet'],
  ['/services', 'Services'],
  ['/orders', 'My orders'],
  ['/requests', 'Requests'],
  ['/business', 'My business'],
];

// Wraps every logged-in page: top menu + redirect to /login if not logged in
export default function Shell({ children }) {
  const { token, ready, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !token) router.replace('/login');
  }, [ready, token, router]);

  if (!ready || !token) return <p className="muted center">Loading...</p>;

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <span className="brand">MultiWallet</span>
          <nav className="links">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className={pathname === href || pathname.startsWith(href + '/') ? 'active' : ''}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="btn btn-outline btn-small"
            onClick={() => {
              signOut();
              router.replace('/login');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
