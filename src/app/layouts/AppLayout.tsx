import { LogOutIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { useLogout, useMe } from '@/features/auth'
import { Logo } from '@/shared/components/Logo'
import { Button } from '@/shared/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet'
import { formatCredits } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'

import { NAV_ITEMS } from './nav-items'

function initial(name: string | undefined) {
  return (name?.trim()[0] ?? '?').toUpperCase()
}

/** Conteúdo da barra lateral (Figma): logo, navegação e usuário + sair no rodapé. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { data: me } = useMe()
  const logout = useLogout()

  const handleLogout = async () => {
    onNavigate?.()
    try {
      await logout.mutateAsync()
    } finally {
      await navigate('/login', { replace: true })
    }
  }

  return (
    <div className="flex h-full flex-col gap-8 bg-sidebar p-4 text-sidebar-foreground">
      <Link
        to="/"
        onClick={onNavigate}
        className="w-fit rounded-sm px-1 outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50"
      >
        <Logo />
      </Link>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        <p className="mb-1 px-2 text-xs text-sidebar-foreground/70">Navegação</p>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'rounded-md px-2 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/50',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-white/10',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
          >
            {initial(me?.fullName)}
          </span>
          <div className="min-w-0 text-sm leading-tight">
            <p className="truncate font-medium">{me?.fullName}</p>
            <p className="text-xs text-sidebar-foreground/80" data-testid="saldo-creditos">
              Créditos: {formatCredits(me?.creditBalance)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={logout.isPending}
          className="flex w-fit items-center gap-2 rounded-md px-1 py-1 text-sm text-sidebar-foreground/90 outline-none hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/50 disabled:opacity-60"
        >
          <LogOutIcon className="size-4" aria-hidden />
          Sair da conta
        </button>
      </div>
    </div>
  )
}

/** Layout das rotas autenticadas. No celular, a barra lateral vira um `sheet`. */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 bg-sidebar px-4 text-sidebar-foreground md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground"
                aria-label="Abrir menu"
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-none p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Navegação principal</SheetDescription>
              <SidebarContent onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <Logo />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
