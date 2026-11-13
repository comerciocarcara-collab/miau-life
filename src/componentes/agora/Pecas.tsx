// Pecinhas das telas Energia e Agora: bateria, gatinho do cartão, escolha de energia e data por extenso.
import type { NivelEnergia } from '../../lib/tipos'
import { LIMITE_ENERGIA, TEXTO_ENERGIA } from '../../lib/fila'
import { parseISO } from '../../lib/datas'

const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "Sexta, 13 de novembro" */
export function dataPorExtenso(dia: string): string {
  const d = parseISO(dia)
  return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

const BARRAS: Record<NivelEnergia, number> = { baixa: 1, media: 2, boa: 3 }

/** Bateria com 1, 2 ou 3 tracinhos (igual à prévia). */
export function Bateria({ nivel, size = 24 }: { nivel: NivelEnergia; size?: number }) {
  const n = BARRAS[nivel]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 10v4" />
      {n >= 2 && <path d="M10 10v4" />}
      {n >= 3 && <path d="M14 10v4" />}
    </svg>
  )
}

/** Gatinho do cartão da tarefa (64x64). */
export function GatinhoCartao({ feliz = false, className }: { feliz?: boolean; className?: string }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M10 30 L13 8 L27 19 Z M54 30 L51 8 L37 19 Z" fill="#F3C9A8" />
      <ellipse cx="32" cy="38" rx="22" ry="19" fill="#F3C9A8" />
      {feliz ? (
        <>
          <path d="M20 37 Q24 32 28 37" stroke="#2D2433" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M36 37 Q40 32 44 37" stroke="#2D2433" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="36" r="2.5" fill="#2D2433" />
          <circle cx="40" cy="36" r="2.5" fill="#2D2433" />
        </>
      )}
      <path d="M30 42 L34 42 L32 44.5 Z" fill="#C8456A" />
      <path d="M29 46 Q32 48.5 35 46" stroke="#2D2433" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M12 40h-7M12 44l-6 3M52 40h7M52 44l6 3" stroke="#2D2433" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export const NIVEIS: NivelEnergia[] = ['baixa', 'media', 'boa']

export function textoLimite(nivel: NivelEnergia): string {
  const n = LIMITE_ENERGIA[nivel]
  return `Hoje o app mostra até ${n} ${n === 1 ? 'tarefa' : 'tarefas'} pra você.`
}

/** As três opções grandes de energia. */
export function EscolhaEnergia({ atual, aoEscolher, compacta = false }: { atual: NivelEnergia | null; aoEscolher: (n: NivelEnergia) => void; compacta?: boolean }) {
  return (
    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Minha energia agora">
      {NIVEIS.map((n) => {
        const ligado = atual === n
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={ligado}
            onClick={() => aoEscolher(n)}
            className={`flex w-full items-center gap-3.5 rounded-[18px] border-2 px-4 text-left ${compacta ? 'min-h-16 py-2.5' : 'min-h-[72px] py-3.5'} ${
              ligado ? 'border-destaque bg-rosa' : 'border-borda bg-cartao'
            }`}
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${ligado ? 'bg-cartao text-destaque' : 'bg-trilho text-suave'}`}>
              <Bateria nivel={n} />
            </span>
            <span className="flex flex-col">
              <span className="text-[17px] font-extrabold leading-tight">{TEXTO_ENERGIA[n].nome}</span>
              <span className="text-sm text-suave">{TEXTO_ENERGIA[n].dica}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
