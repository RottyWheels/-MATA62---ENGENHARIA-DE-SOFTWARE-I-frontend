import { CameraIcon, CoinsIcon, FileTextIcon, type LucideIcon } from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon }

export const NAV_ITEMS: NavItem[] = [
  { to: '/registros', label: 'Registros', icon: FileTextIcon },
  { to: '/capturas/nova', label: 'Nova captura', icon: CameraIcon },
  { to: '/creditos', label: 'Créditos', icon: CoinsIcon },
]
