import { CoinsIcon, LogOutIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { useLogout, useMe } from '@/features/auth'
import { Logo } from '@/shared/components/Logo'
import { ThemeToggle } from '@/shared/components/theme/ThemeToggle'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet'
import { formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

import { NAV_ITEMS } from './nav-items'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
              isActive && 'bg-accent text-accent-foreground',
            )
          }
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Layout das rotas autenticadas: sidebar + header com saldo de créditos. */
export function AppLayout() {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout.mutateAsync()
    } finally {
      await navigate('/login', { replace: true })
    }
  }

  const balance = me?.creditBalance ?? 0

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="px-3 py-1">
          <Logo />
        </Link>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetHeader className="p-0 pb-4">
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <SheetDescription className="sr-only">Navegação principal</SheetDescription>
              </SheetHeader>
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/" className="md:hidden">
            <Logo />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Badge asChild variant="secondary" className="gap-1.5 px-2.5 py-1">
              <Link to="/creditos" aria-label={`Saldo: ${formatNumber(balance)} créditos`}>
                <CoinsIcon aria-hidden />
                <span data-testid="saldo-creditos">
                  {formatNumber(balance)} {balance === 1 ? 'crédito' : 'créditos'}
                </span>
              </Link>
            </Badge>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-1.5" aria-label="Menu do usuário">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {initials(me?.fullName ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-40 truncate text-sm sm:inline">{me?.fullName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate">{me?.fullName}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {me?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={logout.isPending}
                  onSelect={() => void handleLogout()}
                >
                  <LogOutIcon />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
