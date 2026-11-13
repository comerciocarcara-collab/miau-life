// Regras da tela "Agora": o que está guardado na fila, o que cabe na energia de hoje
// e qual é a próxima coisa. Funções puras: só recebem dados e devolvem resultado.
import type { Area, Atividade, Cuidado, Energia, Esforco, NivelEnergia, Ocorrencia, Pausa, Viagem } from './tipos'
import { situacao } from './cuidados'
import { diasEntre, iso } from './datas'
import { ativa } from './agenda'

export const LIMITE_ENERGIA: Record<NivelEnergia, number> = { baixa: 1, media: 2, boa: 3 }

export const TEXTO_ENERGIA: Record<NivelEnergia, { nome: string; dica: string }> = {
  baixa: { nome: 'Baixa', dica: 'Só o essencial, bem leve' },
  media: { nome: 'Média', dica: 'Até 2 tarefas, no meu ritmo' },
  boa: { nome: 'Boa', dica: 'Dá pra render mais hoje' },
}

export interface ItemFila {
  chave: string
  tipo: 'atividade' | 'cuidado'
  titulo: string
  area_id: string | null
  minutos: number | null
  esforco: Esforco | null
  atividade?: Atividade
  cuidado?: Cuidado
  /** Título da tarefa maior, quando este item é um micropasso dela */
  passoDe?: string
  /** "1 de 3" quando é micropasso */
  passo?: string
  peso: number
}

/** A última energia registrada hoje (ou null se ainda não fez o check-in). */
export function energiaDeHoje(energias: Energia[], hoje: string): Energia | null {
  const deHoje = energias.filter((e) => e.dia === hoje)
  if (deHoje.length === 0) return null
  return deHoje.reduce((a, b) => (a.created_at > b.created_at ? a : b))
}

/** Áreas descansando hoje: pausas manuais + Estudos durante uma viagem em andamento. */
export function areasPausadas(hoje: string, pausas: Pausa[], viagens: Viagem[], areas: Area[]): Set<string> {
  const out = new Set<string>()
  for (const p of pausas) if (p.de <= hoje && hoje <= p.ate) out.add(p.area_id)
  const estudos = areas.find((a) => a.chave === 'estudos')
  if (estudos && viagens.some((v) => v.pausar_estudos && emAndamento(v, hoje))) out.add(estudos.id)
  return out
}

export function emAndamento(v: Viagem, hoje: string): boolean {
  return !!v.ida && v.ida <= hoje && (!v.volta || hoje <= v.volta)
}

/** A viagem em andamento, ou a próxima nos próximos `dias` dias. */
export function viagemEmDestaque(viagens: Viagem[], hoje: string, dias = 21): Viagem | null {
  const agora = viagens.find((v) => emAndamento(v, hoje))
  if (agora) return agora
  const futuras = viagens.filter((v) => v.ida && v.ida > hoje && diasEntre(hoje, v.ida) <= dias).sort((a, b) => (a.ida! < b.ida! ? -1 : 1))
  return futuras[0] ?? null
}

const TIPOS_FILA = new Set(['caixa', 'prazo', 'agendada', 'flexivel'])

/**
 * Tudo que está guardado e pode virar "a próxima coisa", já em ordem.
 * Tarefas quebradas em partes aparecem pelo próximo micropasso.
 */
export function filaCompleta(hoje: string, atividades: Atividade[], ocorrencias: Ocorrencia[], cuidados: Cuidado[], pausadas: Set<string>): ItemFila[] {
  const vivas = atividades.filter(ativa)
  const filhos = new Map<string, Atividade[]>()
  for (const a of vivas) if (a.pai_id) filhos.set(a.pai_id, [...(filhos.get(a.pai_id) ?? []), a])
  const out: ItemFila[] = []

  for (const a of vivas) {
    if (a.pai_id || a.status !== 'pendente' || a.eh_deslocamento) continue
    if (!TIPOS_FILA.has(a.tipo)) continue
    if (a.area_id && pausadas.has(a.area_id)) continue
    if (a.adiada_ate && a.adiada_ate > hoje) continue
    if (a.tipo === 'agendada' && a.dia && a.dia > hoje) continue
    if (a.tipo === 'flexivel' && !metaAbertaHoje(a, ocorrencias, hoje)) continue

    const base = peso(a, hoje)
    const passos = (filhos.get(a.id) ?? []).sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0))
    if (passos.length > 0) {
      const pendentes = passos.filter((p) => p.status === 'pendente' && !(p.adiada_ate && p.adiada_ate > hoje))
      const prox = pendentes[0]
      if (!prox) continue
      const n = passos.indexOf(prox) + 1
      out.push({
        chave: prox.id, tipo: 'atividade', titulo: prox.titulo, area_id: a.area_id,
        minutos: prox.minutos ?? 5, esforco: prox.esforco ?? 'leve', atividade: prox,
        passoDe: a.titulo, passo: `${n} de ${passos.length}`, peso: base - 5,
      })
      continue
    }
    out.push({ chave: a.id, tipo: 'atividade', titulo: a.titulo, area_id: a.area_id, minutos: a.minutos ?? null, esforco: a.esforco ?? null, atividade: a, peso: base })
  }

  for (const c of cuidados) {
    if (!c.ativo || (c.area_id && pausadas.has(c.area_id))) continue
    const s = situacao(c, hoje)
    if (s.estado !== 'atrasado' && s.estado !== 'hoje') continue
    out.push({
      chave: `cuidado:${c.id}`, tipo: 'cuidado', titulo: c.nome, area_id: c.area_id,
      minutos: null, esforco: 'leve', cuidado: c, peso: s.estado === 'hoje' ? 30 : 30 - Math.min(s.dias, 20),
    })
  }

  return out.sort((x, y) => x.peso - y.peso || x.titulo.localeCompare(y.titulo, 'pt-BR'))
}

/** Menor peso = vem antes. */
function peso(a: Atividade, hoje: string): number {
  let p = 100
  const data = a.prazo ?? (a.tipo === 'agendada' ? a.dia : null)
  if (data) {
    const d = diasEntre(hoje, data)
    p = d <= 0 ? 0 + d : 10 + Math.min(d, 60) // vencido/hoje primeiro, depois os prazos mais perto
  }
  if (a.prioridade === 'alta') p -= 15
  if (a.tipo === 'flexivel') p = Math.min(p, 50)
  // quem foi adiada muitas vezes não some, mas também não cobra: fica no meio
  p += Math.min(a.adiada_vezes ?? 0, 5)
  return p
}

function metaAbertaHoje(a: Atividade, ocorrencias: Ocorrencia[], hoje: string): boolean {
  const meta = a.meta_semana ?? 0
  if (meta <= 0) return false
  const d = new Date(`${hoje}T12:00:00`)
  const seg = new Date(d)
  seg.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const ini = iso(seg)
  const deles = ocorrencias.filter((o) => o.atividade_id === a.id && o.dia >= ini && o.dia <= hoje)
  if (deles.some((o) => o.dia === hoje && o.feito)) return false
  return deles.filter((o) => o.feito).length < meta
}

/** Cabe na energia? Baixa: só leves ou até 10 min. Média: nada pesado. Boa: tudo. */
export function cabeNaEnergia(i: ItemFila, nivel: NivelEnergia | null): boolean {
  if (!nivel || nivel === 'boa') return true
  if (nivel === 'media') return i.esforco !== 'pesado'
  return i.esforco === 'leve' || (i.minutos !== null && i.minutos <= 10)
}

/** Quantas coisas foram feitas hoje (atividades concluídas + metas registradas hoje). */
export function feitasHoje(atividades: Atividade[], ocorrencias: Ocorrencia[], cuidados: Cuidado[], hoje: string): number {
  const a = atividades.filter((x) => x.status === 'feita' && x.concluida_em && iso(new Date(x.concluida_em)) === hoje && !x.eh_deslocamento).length
  const o = ocorrencias.filter((x) => x.feito && x.dia === hoje).length
  const c = cuidados.filter((x) => x.ultima_em === hoje).length
  return a + o + c
}

/** Petiscos do gatinho: um por coisa feita, desde sempre. Nunca diminui. */
export function petiscos(atividades: Atividade[], ocorrencias: Ocorrencia[]): number {
  return atividades.filter((x) => x.status === 'feita' && !x.eh_deslocamento).length + ocorrencias.filter((o) => o.feito).length
}

export function textoMinutos(m: number | null): string | null {
  if (!m) return null
  if (m < 60) return `cerca de ${m} minutos`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `cerca de ${h}h${String(r).padStart(2, '0')}` : `cerca de ${h}h`
}
