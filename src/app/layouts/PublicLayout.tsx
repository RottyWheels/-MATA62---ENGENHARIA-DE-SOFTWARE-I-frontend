import { Outlet } from 'react-router'

import { Logo } from '@/shared/components/Logo'

import { AuthIllustration } from './AuthIllustration'

/**
 * Login, cadastro e recuperação de senha (Figma): painel verde com a ilustração
 * à esquerda e o formulário sobre fundo branco à direita. No celular, só o formulário.
 */
export function PublicLayout() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <aside className="relative hidden flex-col bg-primary p-8 text-primary-foreground lg:flex">
        <Logo />
        <div className="flex flex-1 items-center justify-center">
          <AuthIllustration />
        </div>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10">
        <Logo className="text-primary lg:hidden" />
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
