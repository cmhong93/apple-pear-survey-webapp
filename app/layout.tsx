import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chungnam Apple Pear Survey DX',
  description: 'Tablet survey, QA, and evidence workflow for apple and pear field surveys.',
}

const navItems = [
  { href: '/login', label: 'Login' },
  { href: '/survey', label: 'Survey' },
  { href: '/admin', label: 'Admin' },
  { href: '/admin/map', label: 'Map' },
  { href: '/admin/nas-package', label: 'NAS' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <strong>Apple Pear Survey DX</strong>
              <span>2026 Chungnam field survey MVP</span>
            </Link>
            <nav className="nav" aria-label="Primary">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  )
}
