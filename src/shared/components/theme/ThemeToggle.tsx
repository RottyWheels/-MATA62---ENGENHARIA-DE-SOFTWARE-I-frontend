import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

import { useTheme } from './use-theme'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}
