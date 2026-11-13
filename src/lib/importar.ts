// Lê a resposta da outra IA (ChatGPT etc.) e transforma em atividades do Miau Life.
// Tolerante de propósito: texto em volta, aspas curvas, vírgula sobrando, campos faltando.
// Nunca joga erro para a tela: devolve avisos gentis.
import type { Area, Esforco, NovaAtividade, TipoAtividade } from './tipos'
import { combinar, hojeISO } from './datas'

export interface PassoImportado {
  titulo: string
  minutos: number | null
}

export interface ItemImportado {
  chave: string
  incluir: boolean
  titulo: string
  area_id: string | null
  tipo: TipoAtividade // caixa · prazo · agendada · compromisso · flexivel
  prazo: string | null
  dia: string | null
  hora: string | null
  fim: string | null
  local: string | null
  deslocamento_min: number | null
  meta_semana: number | null
  minutos: number | null
  esforco: Esforco | null
  passos: PassoImportado[]
  obs: string | null
}

export interface ResultadoLeitura {
  itens: ItemImportado[]
  avisos: string[]
}

// ---------- utilidades ----------

export const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const texto = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' || s.toLowerCase() === 'null' ? null : s
}

const numero = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = texto(v)
  if (!s) return null
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*h(?:oras?)?\s*(\d{1,2})?/i)
  const m = s.match(/(\d+)\s*min/i)
  if (h) return Math.round(parseFloat(h[1].replace(',', '.')) * 60 + (h[2] ? Number(h[2]) : m ? Number(m[1]) : 0))
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** AAAA-MM-DD, DD/MM/AAAA ou DD/MM (ano atual). Devolve null se não for uma data válida. */
export function normalizarData(v: unknown): string | null {
  const s = texto(v)
  if (!s) return null
  let y: number, m: number, d: number
  let r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (r) {
    y = +r[1]
    m = +r[2]
    d = +r[3]
  } else if ((r = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))) {
    d = +r[1]
    m = +r[2]
    y = r[3] ? (r[3].length === 2 ? 2000 + +r[3] : +r[3]) : +hojeISO().slice(0, 4)
  } else return null
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "21:00", "9:5", "21h", "21h30", "9h05" → "HH:MM". */
export function normalizarHora(v: unknown): string | null {
  const s = texto(v)
  if (!s) return null
  const r = s.match(/^(\d{1,2})\s*(?::|h)\s*(\d{1,2})?\s*(?:min)?$/i) ?? s.match(/^(\d{1,2})$/)
  if (!r) return null
  const h = +r[1]
  const m = r[2] ? +r[2] : 0
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizarEsforco(v: unknown): Esforco | null {
  const s = texto(v)
  if (!s) return null
  const t = semAcento(s)
  if (t.startsWith('lev') || t === 'facil' || t === 'baixo') return 'leve'
  if (t.startsWith('med') || t === 'moderado') return 'medio'
  if (t.startsWith('pes') || t === 'dificil' || t === 'alto') return 'pesado'
  return null
}

// ---------- achar o JSON no meio do texto ----------

/** Pedaço balanceado começando em `ini` ({ ou [), respeitando strings. */
function balanceado(s: string, ini: number): string | null {
  const abre = s[ini]
  const fecha = abre === '{' ? '}' : ']'
  let prof = 0
  let emStr = false
  let esc = false
  for (let i = ini; i < s.length; i++) {
    const c = s[i]
    if (emStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') emStr = false
      continue
    }
    if (c === '"') emStr = true
    else if (c === abre) prof++
    else if (c === fecha) {
      prof--
      if (prof === 0) return s.slice(ini, i + 1)
    }
  }
  return null
}

function candidatos(bruto: string): string[] {
  const out: string[] = []
  for (const m of bruto.matchAll(/```[a-zA-Z]*\s*([\s\S]*?)```/g)) out.push(m[1].trim())
  // também tenta achar direto no texto (e dentro dos blocos, caso tenha lixo em volta)
  for (const fonte of [bruto, ...out.slice()]) {
    const s = trocarAspas(fonte)
    for (let i = 0; i < s.length; i++) {
      if (s[i] !== '{' && s[i] !== '[') continue
      const b = balanceado(s, i)
      if (b && b.length > 2) {
        out.push(b)
        break
      }
    }
  }
  return out
}

const trocarAspas = (s: string) => s.replace(/[“”„‟″]/g, '"').replace(/[‘’‚‛′]/g, "'")

function consertar(s: string): string {
  return trocarAspas(s)
    .replace(/^﻿/, '')
    .replace(/(^|[^:"'])\/\/[^\n]*/g, '$1') // comentários // (fora de URLs)
    .replace(/,\s*([}\]])/g, '$1') // vírgula sobrando
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
}

function tentarJSON(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    try {
      return JSON.parse(consertar(s))
    } catch {
      return undefined
    }
  }
}

function listaDe(raiz: unknown): unknown[] | null {
  if (Array.isArray(raiz)) return raiz
  if (raiz && typeof raiz === 'object') {
    const o = raiz as Record<string, unknown>
    for (const k of ['itens', 'items', 'tarefas', 'atividades', 'tasks', 'lista']) if (Array.isArray(o[k])) return o[k] as unknown[]
    if (texto(o.titulo) || texto(o.title) || texto(o.nome)) return [o]
  }
  return null
}

// ---------- área ----------

function achadorDeArea(areas: Area[]) {
  const ativas = areas.filter((a) => !a.arquivada).map((a) => ({ id: a.id, n: semAcento(a.nome), chave: a.chave }))
  return (nome: string | null): string | null | undefined => {
    if (!nome) return null
    const t = semAcento(nome)
    const exata = ativas.find((a) => a.n === t || a.chave === t)
    if (exata) return exata.id
    const contem = ativas.find((a) => a.n.includes(t) || t.includes(a.n) || a.n.split(/[ &]+/)[0] === t.split(/[ &]+/)[0])
    return contem ? contem.id : undefined // undefined = não encontrada
  }
}

// ---------- leitura ----------

let seq = 0
const novaChave = () => `imp-${Date.now().toString(36)}-${seq++}`

export function lerResultado(bruto: string, areas: Area[]): ResultadoLeitura {
  const avisos: string[] = []
  const t = (bruto ?? '').trim()
  if (!t) return { itens: [], avisos: ['Cole aqui a resposta da outra IA.'] }

  let lista: unknown[] | null = null
  for (const c of candidatos(t)) {
    lista = listaDe(tentarJSON(c))
    if (lista) break
  }
  if (!lista) {
    return {
      itens: [],
      avisos: [
        'Não encontrei a lista organizada nesse texto. Confira se copiou a resposta inteira, com o bloco que começa com ```json. Se a IA respondeu só com perguntas, responda a ela e copie de novo.',
      ],
    }
  }

  const area = achadorDeArea(areas)
  const areasNaoAchadas = new Set<string>()
  const itens: ItemImportado[] = []

  for (const bruto of lista) {
    if (typeof bruto === 'string') {
      if (bruto.trim()) itens.push(vazio(bruto.trim()))
      continue
    }
    if (!bruto || typeof bruto !== 'object') continue
    const o = bruto as Record<string, unknown>
    const titulo = texto(o.titulo) ?? texto(o.title) ?? texto(o.nome) ?? texto(o.tarefa)
    if (!titulo) continue

    const nomeArea = texto(o.area) ?? texto(o.área) ?? texto(o.categoria)
    let area_id = area(nomeArea)
    if (area_id === undefined) {
      areasNaoAchadas.add(nomeArea as string)
      area_id = null
    }

    const prazo = normalizarData(o.prazo ?? o.ate ?? o.deadline)
    let dia = normalizarData(o.dia ?? o.data ?? o.date)
    let hora = normalizarHora(o.hora ?? o.inicio ?? o.horario)
    let fim = normalizarHora(o.fim ?? o.termino ?? o.ate_hora)
    if (fim && hora && fim <= hora) fim = null
    if (texto(o.dia ?? o.data) && !dia) avisos.push(`A data de “${titulo}” não estava num formato que eu entendo; deixei sem data.`)

    const tipoTxt = semAcento(texto(o.tipo) ?? 'tarefa')
    let tipo: TipoAtividade
    let meta: number | null = null
    if (/compromisso|evento|reuniao|consulta|appointment|presenca/.test(tipoTxt)) {
      if (dia && hora) tipo = 'compromisso'
      else if (dia) {
        tipo = 'agendada'
        avisos.push(`“${titulo}” veio como compromisso, mas sem horário: guardei como tarefa daquele dia.`)
      } else {
        tipo = prazo ? 'prazo' : 'caixa'
        avisos.push(`“${titulo}” veio como compromisso, mas sem dia: guardei na fila para você marcar depois.`)
      }
    } else if (/agend/.test(tipoTxt)) {
      tipo = dia ? 'agendada' : prazo ? 'prazo' : 'caixa'
    } else if (/meta|flex|semana|habito/.test(tipoTxt)) {
      tipo = 'flexivel'
      const v = numero(o.vezes_semana ?? o.vezes ?? o.meta_semana)
      meta = v && v >= 1 ? Math.min(7, Math.round(v)) : 3
      if (!v) avisos.push(`Não veio quantas vezes por semana para “${titulo}”; coloquei 3. Dá para mudar aqui.`)
    } else {
      tipo = prazo ? 'prazo' : dia ? 'agendada' : 'caixa'
    }
    if (tipo !== 'compromisso' && tipo !== 'agendada') {
      dia = null
      hora = null
      fim = null
    }

    const passosBrutos = Array.isArray(o.passos) ? o.passos : Array.isArray(o.steps) ? o.steps : Array.isArray(o.subtarefas) ? o.subtarefas : []
    const passos: PassoImportado[] = []
    for (const p of passosBrutos) {
      if (typeof p === 'string' && p.trim()) passos.push({ titulo: p.trim(), minutos: null })
      else if (p && typeof p === 'object') {
        const pt = texto((p as Record<string, unknown>).titulo) ?? texto((p as Record<string, unknown>).title) ?? texto((p as Record<string, unknown>).nome)
        if (pt) passos.push({ titulo: pt, minutos: limitarMin(numero((p as Record<string, unknown>).minutos)) })
      }
    }

    const desloc = numero(o.deslocamento_min ?? o.deslocamento)
    itens.push({
      chave: novaChave(),
      incluir: true,
      titulo,
      area_id,
      tipo,
      prazo: tipo === 'prazo' ? prazo : null,
      dia: tipo === 'compromisso' || tipo === 'agendada' ? dia : null,
      hora: tipo === 'compromisso' || tipo === 'agendada' ? hora : null,
      fim: tipo === 'compromisso' || tipo === 'agendada' ? fim : null,
      local: tipo === 'compromisso' ? texto(o.local) : null,
      deslocamento_min: tipo === 'compromisso' && desloc !== null && desloc >= 0 ? Math.round(desloc) : null,
      meta_semana: meta,
      minutos: limitarMin(numero(o.minutos ?? o.duracao ?? o.tempo)),
      esforco: normalizarEsforco(o.esforco ?? o.esforço ?? o.energia),
      passos: tipo === 'compromisso' ? [] : passos,
      obs: texto(o.obs ?? o.observacao ?? o.notas),
    })
  }

  if (areasNaoAchadas.size > 0) {
    const nomes = [...areasNaoAchadas].map((n) => `“${n}”`).join(', ')
    avisos.unshift(`Não achei ${areasNaoAchadas.size === 1 ? 'a área' : 'as áreas'} ${nomes} no seu app; esses itens ficaram sem área (dá para escolher abaixo).`)
  }
  if (itens.length === 0) avisos.push('A lista veio vazia. Confira se a IA terminou de responder.')
  return { itens, avisos }
}

function limitarMin(n: number | null): number | null {
  if (n === null || n <= 0) return null
  return Math.min(600, Math.round(n))
}

function vazio(titulo: string): ItemImportado {
  return {
    chave: novaChave(), incluir: true, titulo, area_id: null, tipo: 'caixa', prazo: null, dia: null, hora: null, fim: null,
    local: null, deslocamento_min: null, meta_semana: null, minutos: null, esforco: null, passos: [], obs: null,
  }
}

// ---------- transformar em atividades ----------

/**
 * Lista pronta para criarVarias(): a tarefa-mãe vem antes dos passos dela.
 * Sem o etapa5.sql (etapa5=false), não manda os campos novos: os passos viram tarefas soltas.
 */
export function paraAtividades(itens: ItemImportado[], etapa5: boolean, gerarId: () => string): NovaAtividade[] {
  const out: NovaAtividade[] = []
  for (const i of itens) {
    if (!i.incluir || !i.titulo.trim()) continue
    const comHora = (i.tipo === 'compromisso' || i.tipo === 'agendada') && !!i.dia && !!i.hora
    const base: NovaAtividade = {
      titulo: i.titulo.trim(),
      tipo: i.tipo,
      area_id: i.area_id,
      descricao: i.obs,
      prazo: i.tipo === 'prazo' ? i.prazo : null,
      dia: i.tipo === 'compromisso' || i.tipo === 'agendada' ? i.dia : null,
      inicio: comHora ? combinar(i.dia as string, i.hora as string) : null,
      fim: comHora && i.fim ? combinar(i.dia as string, i.fim) : null,
      local: i.tipo === 'compromisso' ? i.local : null,
      meta_semana: i.tipo === 'flexivel' ? i.meta_semana ?? 3 : null,
    }
    const passos = i.passos.filter((p) => p.titulo.trim())

    if (etapa5) {
      const id = gerarId()
      out.push({
        ...base,
        id,
        ...(i.minutos ? { minutos: i.minutos } : {}),
        ...(i.esforco ? { esforco: i.esforco } : {}),
        ...(i.tipo === 'compromisso' && i.deslocamento_min !== null ? { deslocamento_min: i.deslocamento_min } : {}),
      })
      passos.forEach((p, k) =>
        out.push({ id: gerarId(), titulo: p.titulo.trim(), tipo: 'caixa', area_id: i.area_id, pai_id: id, ordem: k + 1, minutos: p.minutos ?? 10, esforco: 'leve' }),
      )
    } else if (passos.length > 0) {
      // sem colunas novas: cada passo vira uma tarefa solta "Mãe: passo", com o mesmo prazo
      for (const p of passos) out.push({ ...base, titulo: `${base.titulo}: ${p.titulo.trim()}` })
    } else {
      out.push(base)
    }
  }
  return out
}

/** Despejo rápido: cada linha não vazia vira uma tarefa na fila. Tira marcadores como "-", "•", "1.", "[ ]". */
export function linhasDoDespejo(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•·◦▪]|\d+[.)]|\[\s?[xX ]?\s?\])\s*/, '').trim())
    .filter((l) => l.length > 0)
}
