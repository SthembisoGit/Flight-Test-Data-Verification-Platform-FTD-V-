import Link from 'next/link';
import { ReactNode } from 'react';

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/runs/new', label: 'New Run' },
  { href: '/sessions', label: 'Sessions' }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-10 border-b border-cyan-900/50 bg-[#081018]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/90">AST-VDP</p>
            <h1 className="text-lg font-semibold text-cyan-100">Aerospace Ops Console</h1>
          </div>
          <nav className="flex gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-cyan-800/40 bg-cyan-950/20 px-3 py-1.5 text-sm text-cyan-100 transition hover:border-cyan-400/70 hover:bg-cyan-500/20"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
