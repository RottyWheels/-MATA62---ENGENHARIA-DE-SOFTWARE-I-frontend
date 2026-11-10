import { FileTextIcon, ImageIcon } from 'lucide-react'

/**
 * Ilustração do painel verde das telas públicas (Figma): um cartão de login
 * com ícones de documento e imagem flutuando ao redor. Puramente decorativa.
 */
export function AuthIllustration() {
  return (
    <div aria-hidden className="relative h-64 w-72 select-none">
      <div className="absolute inset-x-6 top-8 bottom-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-foreground/80 bg-white px-6 shadow-lg">
        <div className="h-9 w-full rounded-md border-2 border-foreground/70" />
        <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border-2 border-foreground/70">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="size-1.5 rounded-full bg-[var(--brand)]" />
          ))}
        </div>
        <div className="mt-2 h-9 w-28 rounded-full bg-[var(--brand)]" />
      </div>

      <div className="absolute top-0 left-0 flex size-14 -rotate-12 items-center justify-center rounded-lg bg-[#dcdbe8] text-foreground/80 shadow-md">
        <ImageIcon className="size-8" strokeWidth={1.75} />
      </div>
      <div className="absolute top-4 right-0 flex size-14 rotate-12 items-center justify-center rounded-lg bg-[#dcdbe8] text-foreground/80 shadow-md">
        <FileTextIcon className="size-8" strokeWidth={1.75} />
      </div>
      <div className="absolute bottom-10 left-0 flex size-14 -rotate-6 items-center justify-center rounded-lg bg-[#dcdbe8] text-foreground/80 shadow-md">
        <FileTextIcon className="size-8" strokeWidth={1.75} />
      </div>
    </div>
  )
}
