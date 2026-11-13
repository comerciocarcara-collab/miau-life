import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarPlus, Car, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useApp } from '../../lib/ContextoApp'
import { useForm } from '../ContextoForm'
import { CaixaMarca, useAlternar } from '../ItemCartao'
import { GatoRosto } from '../Gatinhos'
import { conflitosDoDia, type ItemDia } from '../../lib/agenda'
import { dataLonga, hojeISO, parseISO, somarDias } from '../../lib/datas'
import { areasPausadas, cabeNaEnergia, energiaDeHoje, filaCompleta, type ItemFila } from '../../lib/fila'
import { horaDe, janelasLivres, minutosDeslocamento, ocupacao, textoDuracao, type Janela } from '../../lib/janelas'

const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type Linha =
  | { tipo: 'item'; chave: string; inicioMs: number; item: ItemDia }
  | { tipo: 'janela'; chave: string; inicioMs: number; janela: Janela; cabem: ItemFila[] }

const ehDescanso = (t: string) => /soneca|cochil|descans/i.test(t)

/** Cor do bloco, como na prévia: compromisso lilás, estrada cinza, descanso pêssego, tarefa branca. */
function tomDoItem(i: ItemDia): string {
  const a = i.atividade
  if (a.eh_deslocamento) return 'cor-cinza tom'
  if (ehDescanso(a.titulo)) return 'cor-pessego tom'
  if (i.categoria === 'presenca') return 'cor-lilas tom'
  return 'bg-cartao border-2 border-borda'
}

function linhaSecundaria(i: ItemDia): string | null {
  const a = i.atividade
  const oc = ocupacao(i)
  if (a.eh_deslocamento) return i.fimMs !== null ? `chega por volta das ${horaDe(i.fimMs)}` : null
  if (a.deslocamento_min && oc) return `até ${horaDe(oc.fimMs)}, com ida e volta`
  const partes: string[] = []
  if (i.horaFim) partes.push(`até ${i.horaFim}`)
  if (a.local) partes.push(a.local)
  return partes.length ? partes.join(' · ') : null
}

export default function DiaLinhaDoTempo({ dia, itens, ir }: { dia: string; itens: ItemDia[]; ir: (p: Record<string, string | null>) => void }) {
  const { areas, atividades, ocorrencias, cuidados, energias, pausas, viagens } = useApp()
  const { abrirForm } = useForm()
  const alternar = useAlternar()
  const hoje = hojeISO()
  const ehHoje = dia === hoje
  const amanha = somarDias(dia, 1)

  const semRotina = itens.filter((i) => i.categoria !== 'rotina')
  const comHora = semRotina.filter((i) => i.inicioMs !== null && i.fimMs !== null)
  const semHora = semRotina.filter((i) => i.inicioMs === null && i.categoria !== 'presenca')
  const conflitos = conflitosDoDia(semRotina)
  const estrada = minutosDeslocamento(comHora)

  const linhas = useMemo<Linha[]>(() => {
    // dias que já passaram não têm janela livre
    const janelas = dia < hoje ? [] : janelasLivres(dia, comHora, ehHoje ? { agoraMs: Date.now() } : {})

    // O que cabe em cada janela: itens da fila com tempo estimado que cabem no tempo e na energia
    const pausadas = areasPausadas(dia, pausas, viagens, areas)
    const nivel = ehHoje ? energiaDeHoje(energias, hoje)?.nivel ?? null : null
    const fila = filaCompleta(dia, atividades, ocorrencias, cuidados, pausadas).filter((f) => cabeNaEnergia(f, nivel))
    const usados = new Set<string>()

    const out: Linha[] = comHora.map((i) => ({ tipo: 'item', chave: i.chave, inicioMs: ocupacao(i)!.inicioMs, item: i }))
    for (const j of janelas) {
      const cabem = fila.filter((f) => f.minutos !== null && f.minutos <= j.minutos && !usados.has(f.chave)).slice(0, 2)
      cabem.forEach((c) => usados.add(c.chave))
      out.push({ tipo: 'janela', chave: `janela-${j.inicioMs}`, inicioMs: j.inicioMs, janela: j, cabem })
    }
    return out.sort((a, b) => a.inicioMs - b.inicioMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia, hoje, ehHoje, itens, atividades, ocorrencias, cuidados, energias, pausas, viagens, areas])

  const temFila = useMemo(() => filaCompleta(dia, atividades, ocorrencias, cuidados, new Set()).length > 0, [dia, atividades, ocorrencias, cuidados])

  // Resumo de amanhã: até 3 itens, com hora quando houver
  const itensAmanha = useAmanha(amanha)

  const titulo = ehHoje ? 'Seu dia de hoje' : dia === somarDias(hoje, 1) ? 'Seu dia de amanhã' : dia === somarDias(hoje, -1) ? 'Ontem' : DIAS_LONGOS[parseISO(dia).getDay()]
  const vazio = comHora.length === 0

  return (
    <section className="flex flex-col gap-3" aria-label="Agenda do dia">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-suave">{dataLonga(dia)}</p>
          <h1 className="m-0 mt-1 text-[28px] font-extrabold leading-tight">{titulo}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button aria-label="Dia anterior" className="cartao grid h-11 w-11 place-items-center !rounded-full" onClick={() => ir({ dia: somarDias(dia, -1) })}>
            <ChevronLeft size={20} />
          </button>
          {!ehHoje && (
            <button className="cartao h-11 !rounded-full px-3 text-sm font-extrabold" onClick={() => ir({ dia: hoje })}>
              Hoje
            </button>
          )}
          <button aria-label="Próximo dia" className="cartao grid h-11 w-11 place-items-center !rounded-full" onClick={() => ir({ dia: somarDias(dia, 1) })}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {estrada > 0 && (
        <div className="cor-cinza tom flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold">
          <Car size={18} className="shrink-0" />
          <span>
            {ehHoje ? 'Hoje são' : 'Neste dia são'} cerca de {textoDuracao(estrada)} dirigindo. O app já separa esse tempo.
          </span>
        </div>
      )}

      {conflitos.length > 0 && (
        <div role="alert" className="cor-pessego tom flex items-start gap-3 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <span>
            <b>Dois horários se encontram:</b> {conflitos.map((c) => `${c.a.atividade.titulo} (${c.a.hora}) e ${c.b.atividade.titulo} (${c.b.hora})`).join('; ')}.
          </span>
        </div>
      )}

      {vazio && (
        <div className="flex items-center gap-3 px-1">
          <GatoRosto className="h-14 w-20 shrink-0" olhos="feliz" />
          <p className="m-0 font-bold">
            Dia livre, miau! <span className="font-semibold text-suave">Nada com hora marcada.</span>
          </p>
        </div>
      )}

      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {linhas.map((l) =>
          l.tipo === 'item' ? (
            <li key={l.chave} className="flex items-stretch gap-2.5">
              <span className="w-14 shrink-0 pt-2.5 text-sm font-extrabold text-suave">{horaDe(l.inicioMs)}</span>
              <button
                onClick={() => abrirForm({ editar: l.item.atividade })}
                className={`${tomDoItem(l.item)} min-h-11 flex-1 rounded-2xl px-3.5 py-2.5 text-left text-sm font-bold ${l.item.feito ? 'opacity-55' : ''}`}
              >
                <span className={l.item.feito ? 'line-through' : ''}>{l.item.atividade.titulo}</span>
                {linhaSecundaria(l.item) && <span className="block text-[13px] font-semibold">{linhaSecundaria(l.item)}</span>}
              </button>
            </li>
          ) : (
            <li key={l.chave} className="flex items-stretch gap-2.5">
              <span className="w-14 shrink-0 pt-2.5 text-sm font-extrabold text-suave">{horaDe(l.inicioMs)}</span>
              <div className="cor-verde tom flex-1 rounded-2xl px-3.5 py-2.5 text-sm font-bold">
                Janela livre · das {horaDe(l.janela.inicioMs)} às {horaDe(l.janela.fimMs)}
                <span className="block text-[13px] font-semibold">
                  {l.cabem.length > 0
                    ? `cabem: ${l.cabem.map((c) => c.titulo).join(', ')}`
                    : temFila
                      ? 'bom momento pra uma tarefa curta'
                      : 'pra descansar ou fazer o que quiser'}
                </span>
                {ehHoje && temFila && (
                  <Link to="/agora" className="mt-1.5 inline-flex min-h-11 items-center gap-1.5 text-[13px] font-extrabold no-underline" style={{ color: 'inherit' }}>
                    <Sparkles size={16} /> Fazer agora
                  </Link>
                )}
              </div>
            </li>
          ),
        )}
      </ol>

      {semHora.length > 0 && (
        <div className="cartao p-3">
          <h2 className="m-0 mb-1 text-[15px] font-extrabold">Sem hora marcada</h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {semHora.map((i) => (
              <li key={i.chave} className="flex min-h-11 items-center gap-3 border-b border-borda py-1.5 last:border-0">
                <CaixaMarca ligada={i.feito} aoClicar={() => alternar(i)} rotulo={i.feito ? `Desmarcar ${i.atividade.titulo}` : `Concluir ${i.atividade.titulo}`} />
                <button onClick={() => abrirForm({ editar: i.atividade })} className={`flex-1 border-0 bg-transparent p-0 text-left text-sm font-bold ${i.feito ? 'line-through opacity-60' : ''}`}>
                  {i.atividade.titulo}
                </button>
                {i.categoria === 'prazo' && <span className="text-xs font-bold text-suave">prazo</span>}
                {i.categoria === 'flexivel' && <span className="text-xs font-bold text-suave">meta</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {itensAmanha.length > 0 && (
        <div className="cartao px-3.5 py-3 text-[13px] text-suave">
          <span className="font-extrabold text-texto">{DIAS_LONGOS[parseISO(amanha).getDay()]}:</span>{' '}
          {itensAmanha.map((i) => (i.hora ? `${i.atividade.titulo} às ${i.hora}` : i.atividade.titulo)).join(', ')}.
        </div>
      )}

      <button className="btn btn-suave self-center" onClick={() => abrirForm({ dia, tipoInicial: 'compromisso' })}>
        <CalendarPlus size={18} /> Adicionar compromisso
      </button>
    </section>
  )
}

function useAmanha(dia: string): ItemDia[] {
  const { atividades, ocorrencias } = useApp()
  return useMemo(() => {
    // import tardio evita ciclo: itensDoDia está em lib/agenda
    return itensDoDiaSemRotina(dia, atividades, ocorrencias).slice(0, 3)
  }, [dia, atividades, ocorrencias])
}

import { itensDoDia } from '../../lib/agenda'
function itensDoDiaSemRotina(dia: string, ...r: Parameters<typeof itensDoDia> extends [string, ...infer R] ? R : never): ItemDia[] {
  return itensDoDia(dia, ...r).filter((i) => i.categoria !== 'rotina' && !i.atividade.eh_deslocamento)
}
