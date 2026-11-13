// Colocar o que está acumulado no app: organizando com outra IA (ChatGPT etc.) ou na mão.
// Tudo entra na fila guardada, fora da vista: a tela Agora mostra uma coisa por vez.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ClipboardPaste, Copy, PenLine, Sparkles, TriangleAlert, WandSparkles } from 'lucide-react'
import { useApp } from '../lib/ContextoApp'
import { useForm } from '../componentes/ContextoForm'
import { gerarId } from '../lib/dados'
import { hojeISO } from '../lib/datas'
import { conflitosDoDia, itensDoDia } from '../lib/agenda'
import { montarPrompt } from '../lib/promptIA'
import { lerResultado, linhasDoDespejo, paraAtividades, type ItemImportado } from '../lib/importar'
import CartaoConferencia from '../componentes/importar/CartaoConferencia'
import { GatoAlmofada } from '../componentes/Gatinhos'
import type { Atividade } from '../lib/tipos'

type Aba = 'ia' | 'mao'
type Etapa = 'colar' | 'conferir' | 'pronto'

export default function Importar() {
  const { areas, etapa5 } = useApp()
  const [aba, setAba] = useState<Aba>('ia')
  const ativas = useMemo(() => areas.filter((a) => !a.arquivada).sort((a, b) => a.posicao - b.posicao), [areas])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="m-0 text-2xl">Colocar o que está acumulado</h1>
        <p className="m-0 mt-1 text-sm text-suave">Tudo vai para a fila guardada, fora da vista. Depois o app mostra só uma coisa por vez.</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Como colocar">
        <button type="button" className="chip flex-1 justify-center" aria-pressed={aba === 'ia'} onClick={() => setAba('ia')}>
          <WandSparkles size={18} /> Com outra IA
        </button>
        <button type="button" className="chip flex-1 justify-center" aria-pressed={aba === 'mao'} onClick={() => setAba('mao')}>
          <PenLine size={18} /> Na mão
        </button>
      </div>

      {!etapa5 && (
        <p className="m-0 rounded-2xl bg-pessego px-4 py-3 text-sm text-forte-pessego">
          Falta rodar o <b>etapa5.sql</b> no Supabase. Dá para guardar mesmo assim, mas sem tempo estimado e esforço, e os passos pequenos viram tarefas separadas.
        </p>
      )}

      {aba === 'ia' ? <ComOutraIA areas={ativas} /> : <NaMao areas={ativas} />}
    </div>
  )
}

// ---------------- Com outra IA ----------------

function ComOutraIA({ areas }: { areas: ReturnType<typeof useApp>['areas'] }) {
  const { atividades, ocorrencias, criarVarias, etapa5 } = useApp()
  const [etapa, setEtapa] = useState<Etapa>('colar')
  const [copiado, setCopiado] = useState(false)
  const [verPrompt, setVerPrompt] = useState(false)
  const [resposta, setResposta] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [itens, setItens] = useState<ItemImportado[]>([])
  const [salvando, setSalvando] = useState(false)
  const [guardados, setGuardados] = useState(0)

  const prompt = useMemo(() => montarPrompt(areas, hojeISO()), [areas])
  const podeColar = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiado(true)
    } catch {
      // sem permissão de área de transferência: mostra o texto selecionado para copiar na mão
      setVerPrompt(true)
      setTimeout(() => {
        const t = document.getElementById('texto-prompt') as HTMLTextAreaElement | null
        t?.focus()
        t?.select()
      }, 50)
    }
    setTimeout(() => setCopiado(false), 4000)
  }

  async function colar() {
    try {
      const t = await navigator.clipboard.readText()
      if (t) setResposta(t)
    } catch {
      setAvisos(['O celular não deixou colar por aqui. Toque e segure no campo abaixo e escolha “Colar”.'])
    }
  }

  function ler() {
    const r = lerResultado(resposta, areas)
    setAvisos(r.avisos)
    if (r.itens.length > 0) {
      setItens(r.itens)
      setEtapa('conferir')
      window.scrollTo({ top: 0 })
    }
  }

  const mudar = (chave: string, p: Partial<ItemImportado>) => setItens((l) => l.map((i) => (i.chave === chave ? { ...i, ...p } : i)))
  const marcados = itens.filter((i) => i.incluir && i.titulo.trim())
  const nCompromissos = marcados.filter((i) => i.tipo === 'compromisso').length
  const nTarefas = marcados.length - nCompromissos

  // Conflitos: os compromissos importados contra a agenda (e entre si)
  const conflitos = useMemo(() => {
    const novos = paraAtividades(
      marcados.filter((i) => i.tipo === 'compromisso'),
      false,
      gerarId,
    ).map((n, k) => ({ ...n, id: `novo-${k}`, status: 'pendente', excluida_em: null, created_at: '' }) as unknown as Atividade)
    const dias = [...new Set(novos.map((n) => n.dia).filter(Boolean))] as string[]
    const out: string[] = []
    for (const d of dias) {
      for (const c of conflitosDoDia(itensDoDia(d, [...atividades, ...novos], ocorrencias))) {
        if (!c.a.atividade.id.startsWith('novo-') && !c.b.atividade.id.startsWith('novo-')) continue
        const dt = new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'numeric' })
        out.push(`${dt}: “${c.a.atividade.titulo}” (${c.a.hora}) e “${c.b.atividade.titulo}” (${c.b.hora}) batem no horário.`)
      }
    }
    return out
  }, [marcados, atividades, ocorrencias])

  async function guardar() {
    setSalvando(true)
    const lista = paraAtividades(itens, etapa5, gerarId)
    const ok = await criarVarias(lista)
    setSalvando(false)
    if (ok) {
      setGuardados(marcados.length)
      setEtapa('pronto')
      setResposta('')
      setItens([])
      setAvisos([])
      window.scrollTo({ top: 0 })
    }
  }

  if (etapa === 'pronto') {
    return (
      <div className="cartao entrar flex flex-col items-center gap-3 p-6 text-center">
        <GatoAlmofada className="h-28 w-28" />
        <h2 className="m-0 text-xl">Guardado na fila, fora da vista.</h2>
        <p className="m-0 text-suave">
          {guardados === 1 ? '1 coisa entrou' : `${guardados} coisas entraram`}. Você só vai ver uma coisa por vez, no seu ritmo.
        </p>
        <Link to="/agora" className="btn mt-2 w-full no-underline">
          <Sparkles size={18} /> Ir para Agora
        </Link>
        <button type="button" className="btn btn-suave w-full" onClick={() => setEtapa('colar')}>
          Organizar mais coisas
        </button>
      </div>
    )
  }

  if (etapa === 'conferir') {
    return (
      <div className="flex flex-col gap-3">
        <div className="cartao p-4">
          <h2 className="m-0 text-lg">Confira antes de guardar</h2>
          <p className="m-0 mt-1 text-sm text-suave">
            {nTarefas} {nTarefas === 1 ? 'tarefa' : 'tarefas'}, {nCompromissos} {nCompromissos === 1 ? 'compromisso' : 'compromissos'}. Desmarque o que não quiser e ajuste o que precisar.
          </p>
          <button type="button" className="btn mt-3 w-full" disabled={salvando || marcados.length === 0} onClick={guardar}>
            {salvando ? 'Guardando…' : `Guardar tudo (${marcados.length})`}
          </button>
        </div>
        <Avisos lista={avisos} />
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {itens.map((i) => (
            <CartaoConferencia key={i.chave} item={i} areas={areas} mostrarExtras={etapa5} aoMudar={(p) => mudar(i.chave, p)} />
          ))}
        </ul>
        {conflitos.length > 0 && (
          <div className="rounded-2xl bg-pessego px-4 py-3 text-sm text-forte-pessego">
            <p className="m-0 flex items-center gap-2 font-extrabold"><TriangleAlert size={18} /> Horários que se encontram</p>
            <ul className="m-0 mt-1 pl-5">
              {conflitos.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <p className="m-0 mt-1">Dá para guardar assim e ajustar depois na Agenda.</p>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn btn-suave" onClick={() => setEtapa('colar')}>Voltar</button>
          <button type="button" className="btn flex-1" disabled={salvando || marcados.length === 0} onClick={guardar}>
            {salvando ? 'Guardando…' : `Guardar tudo (${marcados.length})`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Passo n={1} titulo="Copie o prompt">
        <p className="m-0 text-sm text-suave">É um texto pronto que explica para a IA como organizar tudo do jeito que o app entende.</p>
        <button type="button" className="btn w-full" onClick={copiar}>
          <Copy size={18} /> {copiado ? 'Copiado!' : 'Copiar prompt'}
        </button>
        <button type="button" className="self-start text-sm font-bold text-suave underline" onClick={() => setVerPrompt((v) => !v)}>
          {verPrompt ? 'Esconder o prompt' : 'Ver o prompt'}
        </button>
        {verPrompt && <textarea id="texto-prompt" readOnly className="campo !h-56 !py-3 font-mono !text-xs" value={prompt} />}
      </Passo>

      <Passo n={2} titulo="Cole no ChatGPT (ou outra IA)">
        <p className="m-0 text-sm text-suave">
          Logo abaixo do prompt, escreva tudo o que está na cabeça, bagunçado mesmo: tarefas, matérias atrasadas, compromissos com dia e hora. Quando a IA responder, copie a resposta.
        </p>
      </Passo>

      <Passo n={3} titulo="Cole a resposta aqui">
        <textarea
          className="campo !h-40 !py-3"
          placeholder="Cole aqui a resposta inteira da IA"
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          aria-label="Resposta da outra IA"
        />
        <Avisos lista={avisos} />
        <div className="flex gap-2">
          {podeColar && (
            <button type="button" className="btn btn-suave" onClick={colar}>
              <ClipboardPaste size={18} /> Colar
            </button>
          )}
          <button type="button" className="btn flex-1" disabled={!resposta.trim()} onClick={ler}>
            Ler resultado
          </button>
        </div>
      </Passo>
    </div>
  )
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="cartao flex flex-col gap-3 p-4">
      <h2 className="m-0 flex items-center gap-3 text-lg">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rosa text-sm text-forte-rosa">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Avisos({ lista }: { lista: string[] }) {
  if (lista.length === 0) return null
  return (
    <ul className="m-0 flex list-none flex-col gap-1 rounded-2xl bg-lilas px-4 py-3 text-sm text-forte-lilas">
      {lista.map((a) => <li key={a}>{a}</li>)}
    </ul>
  )
}

// ---------------- Na mão ----------------

function NaMao({ areas }: { areas: ReturnType<typeof useApp>['areas'] }) {
  const { criarVarias } = useApp()
  const { abrirForm } = useForm()
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [feito, setFeito] = useState<number | null>(null)
  const linhas = linhasDoDespejo(texto)

  async function guardar() {
    setSalvando(true)
    const ok = await criarVarias(linhas.map((titulo) => ({ titulo, tipo: 'caixa' as const, area_id: area || null })))
    setSalvando(false)
    if (ok) {
      setFeito(linhas.length)
      setTexto('')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="cartao flex flex-col gap-3 p-4">
        <h2 className="m-0 text-lg">Despejo rápido</h2>
        <p className="m-0 text-sm text-suave">Uma coisa por linha. Não precisa organizar: depois dá para escolher área e data com calma.</p>
        <textarea
          className="campo !h-44 !py-3"
          placeholder={'lavar a louça\nrevisar aula 3 de anatomia\nmarcar vacina da Dola'}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setFeito(null)
          }}
          aria-label="Despejo rápido, uma tarefa por linha"
        />
        <label className="flex flex-col gap-1 text-xs font-bold text-suave">
          Área para todas (opcional)
          <select className="campo" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Sem área</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
        {feito !== null && (
          <p className="entrar m-0 rounded-2xl bg-verde px-4 py-3 text-sm font-bold text-forte-verde">
            {feito === 1 ? '1 tarefa guardada' : `${feito} tarefas guardadas`} na fila, fora da vista. <Link to="/agora" className="text-forte-verde">Ir para Agora</Link>
          </p>
        )}
        <button type="button" className="btn w-full" disabled={linhas.length === 0 || salvando} onClick={guardar}>
          {salvando ? 'Guardando…' : linhas.length === 0 ? 'Guardar' : `Guardar ${linhas.length} ${linhas.length === 1 ? 'tarefa' : 'tarefas'}`}
        </button>
      </section>

      <section className="cartao flex flex-col gap-2 p-4">
        <h2 className="m-0 text-lg">Com mais detalhes</h2>
        <button type="button" className="btn btn-suave w-full !justify-start" onClick={() => abrirForm({ tipoInicial: 'compromisso' })}>
          <CalendarClock size={18} /> Compromisso rápido
        </button>
        <button type="button" className="btn btn-suave w-full !justify-start" onClick={() => abrirForm({ tipoInicial: 'prazo' })}>
          <PenLine size={18} /> Formulário completo
        </button>
      </section>
    </div>
  )
}
