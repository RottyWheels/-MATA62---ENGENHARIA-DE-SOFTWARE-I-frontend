import { Outlet } from 'react-router'

import { Logo } from '@/shared/components/Logo'
import { ThemeToggle } from '@/shared/components/theme/ThemeToggle'

/** Login, cadastro e recuperação de senha. */
export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
