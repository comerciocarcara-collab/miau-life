import { useMemo, useState } from 'react'
import { Check, ChevronLeft, Pencil, Plane, Plus, X } from 'lucide-react'
import { useApp } from '../lib/ContextoApp'
import { useTabela } from '../lib/useTabela'
import { dataCurta, diasEntre, hojeISO } from '../lib/datas'
import { emAndamento, viagemEmDestaque } from '../lib/fila'
import type { Viagem as TViagem, ViagemItem, ViagemTrecho } from '../lib/tipos'
import { CartaoEmbarque, CartaoPernoite, type Etiqueta } from '../componentes/viagem/CartaoTrecho'
import { FormTrecho, FormViagem, type DadosTrecho, type DadosViagem } from '../componentes/viagem/Formularios'
import { GatoRosto } from '../componentes/Gatinhos'

type Edicao =
  | { qual: 'viagem'; viagem?: TViagem }
  | { qual: 'trecho'; trecho?: ViagemTrecho }

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Ordem: pela hora de partida (ou chegada, no pernoite); sem hora ficam na ordem em que foram criados. */
function ordenarTrechos(a: ViagemTrecho, b: ViagemTrecho) {
  const ta = a.partida ?? a.chegada
  const tb = b.partida ?? b.chegada
  if (ta && tb) return ta < tb ? -1 : 1
  return a.created_at < b.created_at ? -1 : 1
}

/** IDA até chegar no destino da viagem; depois disso é VOLTA. */
function etiquetas(trechos: ViagemTrecho[], destino: string): Etiqueta[] {
  const alvo = semAcento(destino)
  const chegou = trechos.findIndex((t) => t.tipo !== 'pernoite' && !!t.destino_nome && semAcento(t.destino_nome).includes(alvo))
  return trechos.map((_, i) => (chegou < 0 ? (i === 0 ? 'IDA' : 'TRECHO') : i <= chegou ? 'IDA' : 'VOLTA'))
}

function quantoFalta(v: TViagem, hoje: string): string {
  if (emAndamento(v, hoje)) return 'Você está viajando'
  if (!v.ida) return 'Datas a confirmar'
  const d = diasEntre(hoje, v.ida)
  if (d === 1) return 'É amanhã!'
  if (d > 1) return `Faltam ${d} dias`
  return 'Já aconteceu'
}

export default function Viagem() {
  const { recarregarViagens } = useApp()
  const hoje = hojeISO()
  const viagens = useTabela<TViagem>('viagens', (a, b) => (a.ida ?? '9999') < (b.ida ?? '9999') ? -1 : 1)
  const trechos = useTabela<ViagemTrecho>('viagem_trechos', ordenarTrechos)
  const itens = useTabela<ViagemItem>('viagem_itens', (a, b) => (a.created_at < b.created_at ? -1 : 1))
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [verLista, setVerLista] = useState(false)
  const [edicao, setEdicao] = useState<Edicao | null>(null)

  const destaque = useMemo(() => viagemEmDestaque(viagens.itens, hoje, 3650), [viagens.itens, hoje])
  const atual = viagens.itens.find((v) => v.id === escolhida) ?? destaque ?? viagens.itens[viagens.itens.length - 1] ?? null
  const erro = viagens.erro || trechos.erro || itens.erro

  async function salvarViagem(d: DadosViagem) {
    if (edicao?.qual === 'viagem' && edicao.viagem) await viagens.atualizar(edicao.viagem.id, d)
    else {
      const nova = await viagens.adicionar(d as Omit<TViagem, 'id' | 'created_at'>)
      if (nova) setEscolhida(nova.id)
    }
    setEdicao(null)
    setVerLista(false)
    await recarregarViagens()
  }

  async function apagarViagem(v: TViagem) {
    if (!confirm(`Apagar a viagem a ${v.destino}? Os voos, o checklist e os desejos dela também somem.`)) return
    await viagens.remover(v.id)
    setEscolhida(null)
    setEdicao(null)
    await Promise.all([trechos.recarregar(), itens.recarregar(), recarregarViagens()])
  }

  async function salvarTrecho(d: DadosTrecho) {
    if (!atual) return
    if (edicao?.qual === 'trecho' && edicao.trecho) await trechos.atualizar(edicao.trecho.id, d)
    else await trechos.adicionar({ ...d, viagem_id: atual.id })
    setEdicao(null)
  }

  async function apagarTrecho(t: ViagemTrecho) {
    if (!confirm('Apagar este trecho?')) return
    await trechos.remover(t.id)
    setEdicao(null)
  }

  async function mudarPausa(v: TViagem, pausar: boolean) {
    await viagens.atualizar(v.id, { pausar_estudos: pausar })
    await recarregarViagens()
  }

  if (viagens.carregando) return <p className="text-suave">Carregando…</p>

  // Lista de viagens (ou nenhuma ainda)
  if (!atual || verLista) {
    return (
      <div className="flex flex-col gap-4">
        {erro && <AvisoSql />}
        <div className="flex items-center justify-between gap-2">
          <h1 className="m-0 text-2xl">Viagens</h1>
          <button className="btn !min-h-11" onClick={() => setEdicao({ qual: 'viagem' })}>
            <Plus size={18} /> Nova viagem
          </button>
        </div>
        {viagens.itens.length === 0 ? (
          <div className="cartao flex flex-col items-center gap-2 p-6 text-center">
            <GatoRosto olhos="feliz" className="w-28" />
            <p className="m-0 font-extrabold">Nenhuma viagem por aqui ainda</p>
            <p className="m-0 text-sm text-suave">Cadastre a próxima com voos, checklist e o que quer fazer lá. Os estudos podem descansar enquanto você viaja.</p>
          </div>
        ) : (
          viagens.itens.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setEscolhida(v.id)
                setVerLista(false)
              }}
              className="cartao flex min-h-16 items-center gap-3 px-4 py-3 text-left text-inherit"
            >
              <span className="tom cor-lilas grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                <Plane size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{v.destino}</span>
                <span className="block text-sm text-suave">
                  {v.ida ? dataCurta(v.ida) : 'datas a confirmar'}
                  {v.volta ? ` até ${dataCurta(v.volta)}` : ''} · {quantoFalta(v, hoje)}
                </span>
              </span>
            </button>
          ))
        )}
        {edicao && <FormViagem aoSalvar={salvarViagem} aoFechar={() => setEdicao(null)} />}
      </div>
    )
  }

  const meus = trechos.itens.filter((t) => t.viagem_id === atual.id)
  const tags = etiquetas(meus, atual.destino)
  const checklist = itens.itens.filter((i) => i.viagem_id === atual.id && i.tipo === 'checklist')
  const desejos = itens.itens.filter((i) => i.viagem_id === atual.id && i.tipo === 'desejo')
  const feitos = checklist.filter((i) => i.feito).length

  return (
    <div className="flex flex-col gap-4">
      {erro && <AvisoSql />}
      <button onClick={() => setVerLista(true)} className="inline-flex min-h-11 items-center gap-1 self-start border-0 bg-transparent p-0 text-sm font-bold text-suave">
        <ChevronLeft size={18} /> Todas as viagens
      </button>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="m-0 text-sm font-bold text-suave">
            Viagem · {atual.ida ? dataCurta(atual.ida) : 'datas a confirmar'}
            {atual.volta ? ` até ${dataCurta(atual.volta)}` : ''}
          </p>
          <h1 className="m-0 truncate text-[28px] leading-tight">{atual.destino}</h1>
          <p className="m-0 text-sm font-bold text-destaque">{quantoFalta(atual, hoje)}</p>
        </div>
        <button onClick={() => setEdicao({ qual: 'viagem', viagem: atual })} aria-label="Editar viagem" className="cartao grid h-11 w-11 shrink-0 place-items-center !rounded-full text-inherit">
          <Pencil size={18} />
        </button>
      </div>

      {atual.hospedagem && <p className="m-0 -mt-2 text-sm text-suave">Hospedagem: {atual.hospedagem}</p>}

      {/* Trechos */}
      {meus.map((t, i) =>
        t.tipo === 'pernoite' ? (
          <CartaoPernoite key={t.id} t={t} proximo={meus.slice(i + 1).find((x) => x.tipo !== 'pernoite') ?? null} aoEditar={() => setEdicao({ qual: 'trecho', trecho: t })} />
        ) : (
          <CartaoEmbarque key={t.id} t={t} etiqueta={tags[i]} aoEditar={() => setEdicao({ qual: 'trecho', trecho: t })} />
        ),
      )}
      <button className="btn btn-suave" onClick={() => setEdicao({ qual: 'trecho' })}>
        <Plus size={18} /> {meus.length ? 'Adicionar trecho ou pernoite' : 'Adicionar o primeiro voo'}
      </button>

      {/* Modo viagem */}
      <label className="tom cor-lilas flex min-h-14 items-center gap-3 rounded-[20px] px-4 py-3 text-sm font-bold">
        <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--c-destaque)]" checked={atual.pausar_estudos} onChange={(e) => void mudarPausa(atual, e.target.checked)} />
        <span>
          Pausar estudos durante a viagem
          <span className="block text-xs font-semibold opacity-80">Eles somem da tela Agora e voltam sozinhos quando você voltar.</span>
        </span>
      </label>

      {/* Checklist */}
      <section className="cartao flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-lg">Antes de viajar</h2>
          <span className="text-sm font-bold text-suave">
            {feitos} de {checklist.length}
          </span>
        </div>
        <div className="barra-trilho" aria-hidden>
          <div className="barra-valor" style={{ width: checklist.length ? `${(feitos / checklist.length) * 100}%` : '0%' }} />
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {checklist.map((i) => (
            <li key={i.id} className="flex min-h-11 items-center gap-3">
              <button
                onClick={() => void itens.atualizar(i.id, { feito: !i.feito })}
                className="caixa-marca grid shrink-0 place-items-center text-white"
                data-on={i.feito}
                aria-label={i.feito ? `Desmarcar ${i.nome}` : `Marcar ${i.nome}`}
              >
                {i.feito && <Check size={16} strokeWidth={3} />}
              </button>
              <span className={`min-w-0 flex-1 ${i.feito ? 'text-suave line-through' : ''}`}>{i.nome}</span>
              <BotaoTirar nome={i.nome} aoTirar={() => void itens.remover(i.id)} />
            </li>
          ))}
        </ul>
        <NovoItem placeholder="Ex.: fazer o check-in online" aoAdicionar={(nome) => void itens.adicionar({ viagem_id: atual.id, tipo: 'checklist', nome, quando: null, feito: false })} />
      </section>

      {/* Desejos */}
      <section className="cartao flex flex-col gap-3 p-4">
        <div>
          <h2 className="m-0 text-lg">Quero fazer, sem dia ainda</h2>
          <p className="m-0 text-sm text-suave">Sem compromisso: quando der, deu.</p>
        </div>
        {desejos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {desejos.map((d) => (
              <span key={d.id} className={`chip !pr-1 ${d.feito ? 'opacity-60' : ''}`}>
                <button onClick={() => void itens.atualizar(d.id, { feito: !d.feito })} className="flex items-center gap-1.5 border-0 bg-transparent p-0 font-bold text-inherit">
                  {d.feito && <Check size={15} strokeWidth={3} />}
                  <span className={d.feito ? 'line-through' : ''}>{d.nome}</span>
                  {d.quando && <span className="font-semibold text-suave">· {d.quando}</span>}
                </button>
                <BotaoTirar nome={d.nome} aoTirar={() => void itens.remover(d.id)} />
              </span>
            ))}
          </div>
        )}
        <NovoItem placeholder="Ex.: ir no centro" comQuando aoAdicionar={(nome, quando) => void itens.adicionar({ viagem_id: atual.id, tipo: 'desejo', nome, quando: quando ?? null, feito: false })} />
      </section>

      {atual.notas && <p className="m-0 whitespace-pre-line text-sm text-suave">{atual.notas}</p>}

      {edicao?.qual === 'viagem' && (
        <FormViagem inicial={edicao.viagem} aoSalvar={salvarViagem} aoApagar={edicao.viagem ? () => void apagarViagem(edicao.viagem!) : undefined} aoFechar={() => setEdicao(null)} />
      )}
      {edicao?.qual === 'trecho' && (
        <FormTrecho inicial={edicao.trecho} aoSalvar={salvarTrecho} aoApagar={edicao.trecho ? () => void apagarTrecho(edicao.trecho!) : undefined} aoFechar={() => setEdicao(null)} />
      )}
    </div>
  )
}

function AvisoSql() {
  return (
    <p className="tom cor-pessego m-0 rounded-2xl px-4 py-3 text-sm font-semibold">
      As viagens ainda não conseguem ser salvas na nuvem: falta rodar o <b>etapa5.sql</b> no Supabase.
    </p>
  )
}

function BotaoTirar({ nome, aoTirar }: { nome: string; aoTirar: () => void }) {
  return (
    <button
      onClick={() => confirm(`Tirar “${nome}”?`) && aoTirar()}
      aria-label={`Tirar ${nome}`}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-0 bg-transparent text-suave"
    >
      <X size={16} />
    </button>
  )
}

function NovoItem({ placeholder, comQuando, aoAdicionar }: { placeholder: string; comQuando?: boolean; aoAdicionar: (nome: string, quando?: string) => void }) {
  const [nome, setNome] = useState('')
  const [quando, setQuando] = useState('')
  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    aoAdicionar(nome.trim(), quando.trim() || undefined)
    setNome('')
    setQuando('')
  }
  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={placeholder} aria-label="Novo item" />
        <button className="btn !min-h-12 !px-4" aria-label="Adicionar">
          <Plus size={20} />
        </button>
      </div>
      {comQuando && nome.trim() && (
        <input className="campo" value={quando} onChange={(e) => setQuando(e.target.value)} placeholder="Quando? (opcional, ex.: sábado de manhã)" aria-label="Quando" />
      )}
    </form>
  )
}
