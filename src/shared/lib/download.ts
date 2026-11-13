/**
 * Salva um arquivo que veio da API (Blob) com o nome dado. Usado para
 * relatórios e pacotes ZIP: a requisição passa pelo Axios, com sessão e
 * tratamento de erro, em vez de um link direto para a API.
 */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Dá tempo ao navegador de começar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
