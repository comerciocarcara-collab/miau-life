// Agenda do dia: quanto tempo cada compromisso ocupa de verdade (com ida e volta),
// quanto tempo de estrada tem no dia e onde sobram janelas livres.
// Funções puras: só recebem dados e devolvem resultado (fáceis de testar).
import type { Atividade } from './tipos'

/** O mínimo que estas funções precisam de um item da agenda (ItemDia serve). */
export interface ItemComHora {
  inicioMs: number | null
  fimMs: number | null
  feito?: boolean
  atividade: Pick<Atividade, 'deslocamento_min' | 'eh_deslocamento'>
}

export interface OpcoesJanela {
  /** Começo do dia útil, "HH:MM" (padrão 07:00) */
  inicioDia?: string
  /** Fim do dia útil, "HH:MM" (padrão 22:00) */
  fimDia?: string
  /** Janelas menores que isso não aparecem (padrão 30 min) */
  minimoMin?: number
  /** Para o dia de hoje: a janela só começa a partir de agora */
  agoraMs?: number
}

export const INICIO_DIA = '07:00'
export const FIM_DIA = '22:00'
export const MINIMO_JANELA_MIN = 30

export interface Janela {
  inicioMs: number
  fimMs: number
  minutos: number
}

const MIN = 60000

/**
 * Quanto um compromisso ocupa de verdade.
 * `deslocamento_min` é o tempo de ida + volta somados. A metade vai antes
 * (sair de casa) e a metade depois (voltar): academia 08:30–09:40 com 30 min
 * de deslocamento ocupa das 08:15 às 09:55.
 */
export function ocupacao(i: ItemComHora): { inicioMs: number; fimMs: number } | null {
  if (i.inicioMs === null || i.fimMs === null) return null
  const meio = Math.round(((i.atividade.deslocamento_min ?? 0) * MIN) / 2)
  return { inicioMs: i.inicioMs - meio, fimMs: i.fimMs + meio }
}

/** Minutos de estrada no dia: blocos marcados como deslocamento + ida e volta dos compromissos. */
export function minutosDeslocamento(itens: ItemComHora[]): number {
  let total = 0
  for (const i of itens) {
    if (i.atividade.eh_deslocamento && i.inicioMs !== null && i.fimMs !== null) total += Math.max(0, i.fimMs - i.inicioMs) / MIN
    else total += i.atividade.deslocamento_min ?? 0
  }
  return Math.round(total)
}

/** 390 → "6h30", 45 → "45 min", 120 → "2h" */
export function textoDuracao(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const r = min % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

function instante(dia: string, hora: string): number {
  return new Date(`${dia}T${hora}:00`).getTime()
}

/** Espaços livres do dia entre os compromissos (já contando ida e volta). */
export function janelasLivres(dia: string, itens: ItemComHora[], op: OpcoesJanela = {}): Janela[] {
  let ini = instante(dia, op.inicioDia ?? INICIO_DIA)
  const fim = instante(dia, op.fimDia ?? FIM_DIA)
  const minimo = (op.minimoMin ?? MINIMO_JANELA_MIN) * MIN

  if (op.agoraMs !== undefined && op.agoraMs > ini) {
    // arredonda "agora" para os próximos 5 minutos, para não mostrar "das 10:37"
    const passo = 5 * MIN
    ini = Math.ceil(op.agoraMs / passo) * passo
  }
  if (ini >= fim) return []

  const ocupados = itens
    .map(ocupacao)
    .filter((o): o is { inicioMs: number; fimMs: number } => o !== null && o.fimMs > ini && o.inicioMs < fim)
    .sort((a, b) => a.inicioMs - b.inicioMs)

  const out: Janela[] = []
  let cursor = ini
  for (const o of ocupados) {
    if (o.inicioMs > cursor && o.inicioMs - cursor >= minimo) out.push({ inicioMs: cursor, fimMs: o.inicioMs, minutos: Math.round((o.inicioMs - cursor) / MIN) })
    cursor = Math.max(cursor, o.fimMs)
  }
  if (fim - cursor >= minimo) out.push({ inicioMs: cursor, fimMs: fim, minutos: Math.round((fim - cursor) / MIN) })
  return out
}

/** "HH:MM" no fuso do aparelho a partir de um instante em ms. */
export function horaDe(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
