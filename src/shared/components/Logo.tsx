import { cn } from '@/shared/lib/utils'

/** Marca do Veridt (Figma): símbolo de "verificado" + nome. Herda a cor do texto. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-semibold', className)}>
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
      >
        <path d="M5 5l14 14M19 5L5 19" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      </svg>
      Veridt
    </span>
  )
}
