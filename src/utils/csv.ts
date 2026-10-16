// Exporta linhas pra CSV que abre direto no Excel em português: separador
// ";" (o Excel BR usa vírgula como decimal), BOM UTF-8 (acentos) e números
// com vírgula decimal.
export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: (string | number | null | undefined)[][]) {
  const celula = (v: string | number | null | undefined) => {
    if (v == null) return ''
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const conteudo = [cabecalho, ...linhas].map(l => l.map(celula).join(';')).join('\r\n')
  const blob = new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
