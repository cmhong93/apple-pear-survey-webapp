import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '충남 사과·배 현장조사',
  description: '태블릿 조사, 검수, 증빙자료 관리',
}

const navItems = [
  { href: '/login', label: '로그인' },
  { href: '/survey', label: '조사원' },
  { href: '/admin', label: '관리자' },
  { href: '/admin/map', label: '지도' },
  { href: '/admin/nas-package', label: 'NAS' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <strong>충남 사과·배 현장조사</strong>
              <span>2026 태블릿 조사 운영</span>
            </Link>
            <nav className="nav" aria-label="주요 메뉴">
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
