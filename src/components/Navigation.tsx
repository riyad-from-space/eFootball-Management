'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Info, Calendar, Trophy, GitBranch, ListOrdered, BookOpen, Crown, ShieldCheck } from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Tournament', href: '/tournament', icon: Info },
  { name: 'Fixtures', href: '/fixtures', icon: Calendar },
  { name: 'Results', href: '/results', icon: Trophy },
  { name: 'Bracket', href: '/bracket', icon: GitBranch },
  { name: 'Standings', href: '/standings', icon: ListOrdered },
  { name: 'Rules', href: '/rules', icon: BookOpen },
  { name: 'Champion', href: '/champion', icon: Crown },
  { name: 'Admin', href: '/admin', icon: ShieldCheck },
]

function isActivePath(pathname: string | null, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || (!!pathname && pathname.startsWith(href))
}

export default function Navigation() {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-black tracking-wider text-brand-primary glow-text">eFootball</span>
            <span className="rounded bg-brand-secondary px-1.5 py-0.5 text-xxs font-bold tracking-widest text-white">
              Appifylab
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                      : 'text-dark-muted hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-brand-secondary/15 px-3 py-1 text-xs font-semibold text-brand-secondary border border-brand-secondary/25">
              <span className="h-2 w-2 rounded-full bg-brand-secondary animate-pulse"></span>
              LIVE
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — horizontally scrollable so all pages fit */}
      <div className="lg:hidden fixed bottom-0 left-0 z-40 w-full border-t border-dark-border bg-dark-bg/95 backdrop-blur-lg pb-safe">
        <nav className="flex h-16 items-stretch overflow-x-auto no-scrollbar px-1">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex min-w-[4.25rem] flex-col items-center justify-center gap-0.5 px-1 transition-colors duration-200 ${
                  active ? 'text-brand-primary' : 'text-dark-muted hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xxs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
