import type { ReactNode } from 'react'

export function Erro({ texto }: { texto: string | null }) {
  if (!texto) return null
  return <p role="alert" className="m-0 rounded-2xl bg-pessego/60 px-4 py-3 text-sm">{texto}</p>
}

export function Chip({ ativo, aoClicar, children }: { ativo: boolean; aoClicar: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoClicar}
      className={`shrink-0 whitespace-nowrap rounded-full border-2 px-4 py-1.5 text-sm font-bold ${ativo ? 'border-transparent bg-destaque text-white' : 'border-borda bg-cartao'}`}
    >
      {children}
    </button>
  )
}

/** "12,5" ou "12.5" ou vazio -> número ou null. */
export function numero(v: string): number | null {
  const n = Number(v.replace(',', '.').trim())
  return v.trim() === '' || Number.isNaN(n) ? null : n
}
export const fmt = (n: number | null | undefined, casas = 1) => (n === null || n === undefined ? '—' : n.toFixed(casas).replace('.', ','))
