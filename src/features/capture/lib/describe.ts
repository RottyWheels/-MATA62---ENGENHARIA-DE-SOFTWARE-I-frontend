/** "x imagens e 1 vídeo", a partir do que foi capturado na sessão. */
export function describeCaptured(screenshots: number, recordings: number) {
  const parts = [
    screenshots ? `${screenshots} ${screenshots === 1 ? 'imagem' : 'imagens'}` : null,
    recordings ? `${recordings} ${recordings === 1 ? 'vídeo' : 'vídeos'}` : null,
  ].filter(Boolean)
  return parts.join(' e ') || 'Nenhum arquivo'
}
