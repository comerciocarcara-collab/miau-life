import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Play, WandSparkles } from 'lucide-react'
import { useApp } from '../lib/ContextoApp'
import { gerarId } from '../lib/dados'
import {
  LIMITE_ENERGIA, TEXTO_ENERGIA, areasPausadas, cabeNaEnergia, emAndamento, energiaDeHoje, feitasHoje, filaCompleta, petiscos,
  textoMinutos, type ItemFila,
} from '../lib/fila'
import { dataCurta, hojeISO, somarDias } from '../lib/datas'
import type { Area, Atividade } from '../lib/tipos'
import { GatoAlmofada, GatoRosto } from '../componentes/Gatinhos'
import { Bateria, EscolhaEnergia, GatinhoCartao } from '../componentes/agora/Pecas'
import QuebrarPartes from '../componentes/agora/QuebrarPartes'
import Timer from '../componentes/agora/Timer'

type Desfazer = { texto: string; acao: () => void }

/** "Só 1 coisa agora": uma tarefa por vez, do tamanho da energia de hoje. */
export default function Agora() {
  const {
    areas, atividades, ocorrencias, cuidados, pausas, viagens, energias, etapa5,
    registrarEnergia, atualizar, marcarOcorrencia, atualizarCuidadoPorId, criarVarias,
  } = useApp()
  const hoje = hojeISO()
  const energia = energiaDeHoje(energias, hoje)
  const nivel = energia?.nivel ?? null

  const [escondidas, setEscondidas] = useState<Set<string>>(new Set()) // "Depois" nesta sessão
  const [extras, setExtras] = useState(0) // "Quero mais uma"
  const [ignorarEnergia, setIgnorarEnergia] = useState(false)
  const [timer, setTimer] = useState(false)
  const [quebrando, setQuebrando] = useState<Atividade | null>(null)
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [petiscosSessao, setPetiscosSessao] = useState(0) // cuidados feitos aqui também ganham petisco
  const [pulo, setPulo] = useState(0) // reinicia a animação do petisco

  const pausadas = useMemo(() => areasPausadas(hoje, pausas, viagens, areas), [hoje, pausas, viagens, areas])
  const fila = useMemo(() => filaCompleta(hoje, atividades, ocorrencias, cuidados, pausadas), [hoje, atividades, ocorrencias, cuidados, pausadas])
  const visiveis = fila.filter((i) => !escondidas.has(i.chave))
  const cabem = ignorarEnergia ? visiveis : visiveis.filter((i) => cabeNaEnergia(i, nivel))
  const proxima: ItemFila | undefined = cabem[0]
  const guardadas = visiveis.filter((i) => i !== proxima)

  const feitas = feitasHoje(atividades, ocorrencias, cuidados, hoje)
  const limite = nivel ? LIMITE_ENERGIA[nivel] + extras : 0
  const combinadoFeito = !!nivel && feitas >= limite
  const totalPetiscos = petiscos(atividades, ocorrencias) + petiscosSessao

  // a cada nova tarefa, o timer fecha
  useEffect(() => setTimer(false), [proxima?.chave])

  useEffect(() => {
    if (!desfazer) return
    const t = setTimeout(() => setDesfazer(null), 6000)
    return () => clearTimeout(t)
  }, [desfazer])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  const areaDe = (id: string | null) => areas.find((a) => a.id === id) ?? null

  const viagemAgora = viagens.find((v) => emAndamento(v, hoje))
  const nomesPausados = areas.filter((a) => pausadas.has(a.id)).map((a) => a.nome.toLowerCase())
  const avisoPausa =
    nomesPausados.length === 0
      ? null
      : viagemAgora
        ? `Modo viagem: ${juntar(nomesPausados)} ${nomesPausados.length === 1 ? 'pausado' : 'pausados'} até você voltar${viagemAgora.volta ? ` (${dataCurta(viagemAgora.volta)})` : ''}.`
        : `${capitalizar(juntar(nomesPausados))} ${nomesPausados.length === 1 ? 'está descansando' : 'estão descansando'} por enquanto.`

  function feito(item: ItemFila) {
    const agora = new Date().toISOString()
    if (item.cuidado) {
      const c = item.cuidado
      void atualizarCuidadoPorId(c.id, { ultima_em: hoje, anterior_em: c.ultima_em })
      setPetiscosSessao((n) => n + 1)
      setDesfazer({
        texto: `“${c.nome}” feito`,
        acao: () => {
          void atualizarCuidadoPorId(c.id, { ultima_em: c.ultima_em, anterior_em: c.anterior_em })
          setPetiscosSessao((n) => Math.max(0, n - 1))
        },
      })
    } else if (item.atividade) {
      const a = item.atividade
      if (a.tipo === 'flexivel') {
        void marcarOcorrencia(a.id, hoje, 'feita')
        setDesfazer({ texto: `“${a.titulo}” registrado hoje`, acao: () => void marcarOcorrencia(a.id, hoje, null) })
      } else {
        void atualizar(a.id, { status: 'feita', concluida_em: agora })
        // último micropasso? a tarefa maior também fica pronta
        const mae = a.pai_id ? atividades.find((x) => x.id === a.pai_id) : undefined
        const irmasPendentes = mae ? atividades.filter((x) => x.pai_id === mae.id && x.id !== a.id && x.status === 'pendente' && !x.excluida_em) : []
        const fechaMae = !!mae && mae.status === 'pendente' && irmasPendentes.length === 0
        if (fechaMae) void atualizar(mae.id, { status: 'feita', concluida_em: agora })
        setDesfazer({
          texto: fechaMae ? `Todos os passos de “${mae.titulo}” feitos!` : `“${a.titulo}” feito`,
          acao: () => {
            void atualizar(a.id, { status: 'pendente', concluida_em: null })
            if (fechaMae) void atualizar(mae.id, { status: 'pendente', concluida_em: null })
          },
        })
      }
    }
    setPulo((p) => p + 1)
  }

  function depois(item: ItemFila) {
    setEscondidas((s) => new Set(s).add(item.chave))
    const a = item.atividade
    if (a && etapa5) {
      void atualizar(a.id, { adiada_ate: somarDias(hoje, 1), adiada_vezes: (a.adiada_vezes ?? 0) + 1 })
      setAviso('Guardei pra amanhã. Sem pressa.')
      setDesfazer({
        texto: `“${a.titulo}” guardada`,
        acao: () => {
          void atualizar(a.id, { adiada_ate: a.adiada_ate ?? null, adiada_vezes: a.adiada_vezes ?? 0 })
          setEscondidas((s) => {
            const n = new Set(s)
            n.delete(item.chave)
            return n
          })
        },
      })
    } else {
      setAviso('Guardei por agora. Ela volta mais tarde, sem cobrança.')
    }
  }

  async function salvarPassos(mae: Atividade, passos: string[]) {
    const ok = await criarVarias(
      passos.map((titulo, i) => ({ id: gerarId(), titulo, tipo: 'caixa' as const, pai_id: mae.id, ordem: i + 1, area_id: mae.area_id, minutos: 5, esforco: 'leve' as const })),
    )
    if (ok) setAviso('Pronto! Agora é um passo de cada vez.')
    return ok
  }

  const podeQuebrar = !!proxima?.atividade && !proxima.passoDe && proxima.atividade.tipo !== 'flexivel'

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3.5">
      <div className="flex items-center justify-between gap-2">
        {nivel ? (
          <Link
            to="/energia"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-rosa px-3.5 text-[13px] font-extrabold text-forte-rosa no-underline"
            aria-label={`Energia ${TEXTO_ENERGIA[nivel].nome.toLowerCase()}. Toque para mudar.`}
          >
            <Bateria nivel={nivel} size={18} /> Energia {TEXTO_ENERGIA[nivel].nome.toLowerCase()}
          </Link>
        ) : (
          <span className="text-sm font-extrabold text-suave">Só 1 coisa agora</span>
        )}
        <span key={pulo} className={`text-[13px] font-extrabold text-suave ${pulo > 0 ? 'petisco' : ''}`} aria-live="polite">
          {totalPetiscos} {totalPetiscos === 1 ? 'petisco' : 'petiscos'} pro gatinho
        </span>
      </div>

      {avisoPausa && <div className="tom cor-lilas rounded-[14px] px-3.5 py-2.5 text-[13px] font-semibold">{avisoPausa}</div>}

      {!nivel ? (
        <section className="cartao entrar flex flex-col gap-3 p-5">
          <h1 className="m-0 text-2xl leading-tight">Como tá sua energia agora?</h1>
          <p className="m-0 text-sm text-suave">Antes de tudo: o app mostra só o que cabe no seu dia de hoje.</p>
          <EscolhaEnergia atual={null} compacta aoEscolher={(n) => void registrarEnergia(n, [])} />
        </section>
      ) : combinadoFeito && !(proxima === undefined && visiveis.length === 0) ? (
        <section className="cartao entrar flex flex-col items-center gap-2 p-6 text-center">
          <GatoRosto className="h-24 w-32" olhos="feliz" />
          <h1 className="m-0 text-2xl leading-tight">Você fez o combinado de hoje</h1>
          <p className="m-0 text-[15px] text-suave">
            {feitas} {feitas === 1 ? 'coisa feita' : 'coisas feitas'}. O resto fica guardadinho, sem pressa.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <button type="button" className="btn w-full" onClick={() => setExtras((e) => e + 1)}>
              Quero mais uma
            </button>
            <Link to="/" className="btn btn-suave w-full no-underline">
              Descansar
            </Link>
          </div>
        </section>
      ) : proxima ? (
        <CartaoTarefa
          key={proxima.chave}
          item={proxima}
          area={areaDe(proxima.area_id)}
          numero={Math.min(feitas + 1, limite)}
          limite={limite}
          timer={timer}
          podeQuebrar={podeQuebrar}
          aoFeito={() => feito(proxima)}
          aoDepois={() => depois(proxima)}
          aoQuebrar={() => proxima.atividade && setQuebrando(proxima.atividade)}
          aoTimer={() => setTimer(true)}
          aoFecharTimer={() => setTimer(false)}
        />
      ) : visiveis.length > 0 ? (
        <section className="cartao entrar flex flex-col items-center gap-2 p-6 text-center">
          <GatoRosto className="h-24 w-32" olhos="feliz" />
          <h1 className="m-0 text-xl leading-tight">Nada bem leve na fila agora</h1>
          <p className="m-0 text-[15px] text-suave">Hoje pode ser só descanso. Se quiser, eu mostro a próxima mesmo assim.</p>
          <button type="button" className="btn btn-suave mt-2 w-full" onClick={() => setIgnorarEnergia(true)}>
            Mostrar a próxima mesmo assim
          </button>
        </section>
      ) : (
        <section className="cartao entrar flex flex-col items-center gap-2 p-6 text-center">
          <GatoAlmofada className="h-24 w-36" />
          <h1 className="m-0 text-xl leading-tight">Nada guardado por aqui</h1>
          <p className="m-0 text-[15px] text-suave">Sua fila está vazia. Quer despejar o que está na cabeça? O app guarda e mostra uma coisa de cada vez.</p>
          <Link to="/importar" className="btn mt-2 w-full no-underline">
            <WandSparkles size={18} /> Despejar o que está na cabeça
          </Link>
        </section>
      )}

      {nivel && guardadas.length > 0 && (
        <section aria-label="Guardadas pra depois">
          <h2 className="m-0 mb-2 mt-1 text-[15px]">Guardadas pra depois</h2>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {guardadas.slice(0, 2).map((g) => {
              const a = areaDe(g.area_id)
              return (
                <li key={g.chave} className="flex items-center gap-2.5 rounded-xl border border-borda bg-cartao px-3.5 py-2.5 text-sm">
                  <span className={`bolinha h-2.5 w-2.5 shrink-0 rounded-full ${a ? `cor-${a.cor}` : 'cor-cinza'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{g.titulo}</span>
                </li>
              )
            })}
          </ul>
          {guardadas.length > 2 && (
            <p className="m-0 mt-1.5 text-[13px] text-suave">
              Mais {guardadas.length - 2} {guardadas.length - 2 === 1 ? 'guardada' : 'guardadas'}, fora da vista por enquanto.
            </p>
          )}
        </section>
      )}

      {(desfazer || aviso) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-8">
          <div role="status" className="entrar pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-texto px-4 py-2.5 text-sm font-semibold text-fundo">
            <span className="min-w-0 flex-1">
              {desfazer ? (
                <>
                  {desfazer.texto} <span className="whitespace-nowrap">· +1 petisco</span>
                </>
              ) : (
                aviso
              )}
            </span>
            {desfazer && (
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-xl border-0 bg-transparent px-2 font-extrabold text-fundo underline"
                onClick={() => {
                  desfazer.acao()
                  setDesfazer(null)
                  setAviso(null)
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        </div>
      )}

      {quebrando && <QuebrarPartes atividade={quebrando} aoFechar={() => setQuebrando(null)} aoSalvar={(p) => salvarPassos(quebrando, p)} />}
    </div>
  )
}

function CartaoTarefa({
  item, area, numero, limite, timer, podeQuebrar, aoFeito, aoDepois, aoQuebrar, aoTimer, aoFecharTimer,
}: {
  item: ItemFila
  area: Area | null
  numero: number
  limite: number
  timer: boolean
  podeQuebrar: boolean
  aoFeito: () => void
  aoDepois: () => void
  aoQuebrar: () => void
  aoTimer: () => void
  aoFecharTimer: () => void
}) {
  const tempo = textoMinutos(item.minutos)
  const etiqueta = item.cuidado ? `${area?.nome ?? 'Cuidado'} · ${item.cuidado.grupo}` : (area?.nome ?? 'Sem área')
  return (
    <section className="entrar flex flex-col gap-3 rounded-3xl border-2 border-borda bg-cartao p-5" aria-label="Sua próxima coisa">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span className={`tom self-start rounded-full px-3 py-1 text-[13px] font-extrabold ${area ? `cor-${area.cor}` : 'cor-cinza'}`}>{etiqueta}</span>
          <span className="text-[13px] font-semibold text-suave">
            Tarefa {numero} de {limite} hoje
          </span>
        </div>
        <GatinhoCartao className="shrink-0" />
      </div>

      {item.passoDe && (
        <p className="m-0 text-[13px] font-bold text-suave">
          Passo {item.passo} de “{item.passoDe}”
        </p>
      )}
      <h1 className="m-0 text-[28px] leading-[1.15] [overflow-wrap:anywhere]">{item.titulo}</h1>
      {item.cuidado?.versao_minima && <p className="m-0 text-[15px] text-suave">Versão mínima: {item.cuidado.versao_minima}</p>}
      {tempo && (
        <p className="m-0 flex items-center gap-1.5 text-[15px] text-suave">
          <Clock size={18} /> {tempo}
        </p>
      )}

      {timer && <Timer aoTerminar={aoFecharTimer} />}

      <button type="button" className="btn mt-1.5 !min-h-[52px] text-[17px]" onClick={aoFeito}>
        Feito
      </button>
      <div className="flex gap-2">
        <button type="button" className="btn btn-suave !min-h-12 flex-1 px-3 text-[15px]" onClick={aoDepois}>
          Depois
        </button>
        <button
          type="button"
          className="btn btn-suave !min-h-12 flex-1 px-3 text-[15px]"
          onClick={aoQuebrar}
          disabled={!podeQuebrar}
          title={podeQuebrar ? undefined : 'Esta já é pequenininha'}
        >
          Quebrar em partes
        </button>
      </div>
      {!timer && (
        <button type="button" className="btn btn-tracejado !min-h-12 text-[15px]" onClick={aoTimer}>
          <Play size={18} /> Só 10 minutos
        </button>
      )}
    </section>
  )
}

function juntar(l: string[]): string {
  if (l.length <= 1) return l[0] ?? ''
  return `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`
}
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
