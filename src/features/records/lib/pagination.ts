/** Números de página a mostrar: todas até 7; acima disso, a primeira, a última e as vizinhas. */
export function pageNumbers(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  return sorted.flatMap((p, i) =>
    i > 0 && p - (sorted[i - 1] ?? p) > 1 ? ['gap' as const, p] : [p],
  )
}
