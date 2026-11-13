import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Minus, Pencil } from 'lucide-react'
import { useApp } from '../../lib/ContextoApp'
import { useTabela } from '../../lib/useTabela'
import { metasDaSemana } from '../../lib/agenda'
import { hojeISO } from '../../lib/datas'
import type { Area, AguaDia, FitPerfil, Treino, TreinoFeito } from '../../lib/tipos'
import { CaixaMarca } from '../ItemCartao'
import Folha from '../Folha'
import Medidas from './Medidas'
import Treinos, { textoDias } from './Treinos'
import Receitas from './Receitas'
import { Chip, Erro, numero } from './comum'

type Aba = 'hoje' | 'medidas' | 'treinos' | 'receitas'
const ABAS: { id: Aba; nome: string }[] = [
  { id: 'hoje', nome: 'Hoje' },
  { id: 'medidas', nome: 'Medidas' },
  { id: 'treinos', nome: 'Treinos' },
  { id: 'receitas', nome: 'Receitas' },
]

export default function VidaFit({ area }: { area: Area }) {
  const [aba, setAba] = useState<Aba>('hoje')
  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Vida Fit">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border-2 px-5 py-2 font-bold ${aba === a.id ? 'border-transparent bg-destaque text-white' : 'border-borda bg-cartao'}`}
          >
            {a.nome}
          </button>
        ))}
      </div>
      {aba === 'hoje' && <Hoje area={area} irPara={setAba} />}
      {aba === 'medidas' && <Medidas />}
      {aba === 'treinos' && <Treinos />}
      {aba === 'receitas' && <Receitas />}
    </div>
  )
}

const PASSOS = [200, 300, 500]

function Hoje({ area, irPara }: { area: Area; irPara: (a: Aba) => void }) {
  const { atividades, ocorrencias } = useApp()
  const hoje = hojeISO()
  const agua = useTabela<AguaDia>('agua')
  const perfil = useTabela<FitPerfil>('fit_perfil')
  const treinos = useTabela<Treino>('treinos')
  const feitos = useTabela<TreinoFeito>('treinos_feitos')
  const [editMeta, setEditMeta] = useState(false)

  const metaMl = perfil.itens[0]?.meta_agua_ml ?? 2000
  const linhaHoje = agua.itens.find((a) => a.dia === hoje)
  const ml = linhaHoje?.ml ?? 0
  const pct = Math.min(100, Math.round((ml / metaMl) * 100))

  async function somar(delta: number) {
    const novo = Math.max(0, ml + delta)
    if (novo === ml) return
    if (linhaHoje) await agua.atualizar(linhaHoje.id, { ml: novo })
    else await agua.adicionar({ dia: hoje, ml: novo })
  }

  const diaSemana = new Date().getDay()
  const doDia = treinos.itens.filter((t) => t.dias_semana?.includes(diaSemana))
  const livres = treinos.itens.filter((t) => !t.dias_semana || t.dias_semana.length === 0)
  const feitoHoje = (t: Treino) => feitos.itens.find((f) => f.treino_id === t.id && f.dia === hoje)

  async function alternar(t: Treino) {
    const f = feitoHoje(t)
    if (f) await feitos.remover(f.id)
    else await feitos.adicionar({ treino_id: t.id, dia: hoje })
  }

  const metas = useMemo(
    () => metasDaSemana(hoje, atividades.filter((a) => a.area_id === area.id), ocorrencias).metas,
    [atividades, ocorrencias, area.id, hoje],
  )

  const LinhaTreino = ({ t }: { t: Treino }) => (
    <li className="cartao flex items-center gap-3 p-3">
      <CaixaMarca ligada={!!feitoHoje(t)} aoClicar={() => void alternar(t)} rotulo={feitoHoje(t) ? `Desmarcar ${t.nome}` : `Marcar ${t.nome} como feito`} />
      <div className="min-w-0 flex-1">
        <span className={`block font-extrabold leading-tight ${feitoHoje(t) ? 'line-through opacity-60' : ''}`}>{t.nome}</span>
        <span className="text-xs text-suave">{t.exercicios.length} {t.exercicios.length === 1 ? 'exercício' : 'exercícios'} · {textoDias(t.dias_semana)}</span>
      </div>
    </li>
  )

  return (
    <div className="flex flex-col gap-4">
      <Erro texto={agua.erro ?? perfil.erro ?? treinos.erro ?? feitos.erro} />

      <section className="cartao flex flex-col gap-3 p-4" aria-label="Água de hoje">
        <div className="flex items-center justify-between">
          <h2 className="m-0 flex items-center gap-2 text-lg font-semibold text-titulo"><Droplets size={22} /> Água de hoje</h2>
          <button className="grid h-9 w-9 place-items-center border-0 bg-transparent text-suave" aria-label="Mudar a meta de água" onClick={() => setEditMeta(true)}>
            <Pencil size={17} />
          </button>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold">{(ml / 1000).toFixed(1).replace('.', ',')} L</span>
            <span className="text-sm text-suave">meta {(metaMl / 1000).toFixed(1).replace('.', ',')} L · {pct}%</span>
          </div>
          <div className="barra-trilho mt-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Meta de água">
            <div className="barra-valor" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PASSOS.map((p) => (
            <button key={p} className="btn !min-h-11 !px-4 text-sm" onClick={() => void somar(p)}>+{p} ml</button>
          ))}
          <button className="btn btn-suave !min-h-11 !px-3" aria-label="Tirar 200 ml" disabled={ml === 0} onClick={() => void somar(-200)}>
            <Minus size={18} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-label="Treino de hoje">
        <h2 className="m-0 text-lg font-semibold text-titulo">Treino de hoje</h2>
        {doDia.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">{doDia.map((t) => <LinhaTreino key={t.id} t={t} />)}</ul>
        ) : (
          <p className="cartao m-0 p-4 text-center text-sm text-suave">
            Nenhum treino marcado para hoje.{' '}
            <button className="border-0 bg-transparent p-0 font-bold text-titulo" onClick={() => irPara('treinos')}>
              {treinos.itens.length === 0 ? 'Criar um treino' : 'Ver meus treinos'}
            </button>
          </p>
        )}
        {livres.length > 0 && (
          <>
            <h3 className="m-0 mt-1 text-sm font-extrabold uppercase tracking-wide text-suave">Sem dia fixo</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">{livres.map((t) => <LinhaTreino key={t.id} t={t} />)}</ul>
          </>
        )}
      </section>

      {metas.length > 0 && (
        <section className="cartao p-4">
          <h2 className="m-0 mb-2 text-lg font-semibold text-titulo">Metas da semana</h2>
          <ul className="m-0 list-none p-0">
            {metas.map((m) => (
              <li key={m.atividade.id} className="flex justify-between py-1 font-bold">
                <span>{m.atividade.titulo}</span>
                <span className="text-suave">{Math.min(m.feitas, m.meta)}/{m.meta}</span>
              </li>
            ))}
          </ul>
          <Link to="/tarefas?aba=metas" className="mt-2 inline-block text-sm font-bold text-titulo">Marcar os dias →</Link>
        </section>
      )}

      {editMeta && (
        <FormAgua
          atual={metaMl}
          aoFechar={() => setEditMeta(false)}
          aoSalvar={async (v) => {
            const p = perfil.itens[0]
            if (p) await perfil.atualizar(p.id, { meta_agua_ml: v })
            else await perfil.adicionar({ meta_agua_ml: v, meta_peso_kg: null })
            setEditMeta(false)
          }}
        />
      )}
    </div>
  )
}

function FormAgua({ atual, aoFechar, aoSalvar }: { atual: number; aoFechar: () => void; aoSalvar: (ml: number) => Promise<void> }) {
  const [v, setV] = useState(String(atual / 1000).replace('.', ','))
  const [erro, setErro] = useState<string | null>(null)
  return (
    <Folha titulo="Meta de água" aoFechar={aoFechar}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const l = numero(v)
          if (l === null || l < 0.5 || l > 10) return setErro('Informe um valor entre 0,5 e 10 litros.')
          await aoSalvar(Math.round(l * 1000))
        }}
      >
        <div>
          <label className="rotulo" htmlFor="meta-agua">Quantos litros por dia?</label>
          <input id="meta-agua" inputMode="decimal" className="campo" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1.5, 2, 2.5, 3].map((l) => <Chip key={l} ativo={numero(v) === l} aoClicar={() => setV(String(l).replace('.', ','))}>{String(l).replace('.', ',')} L</Chip>)}
        </div>
        {erro && <p className="m-0 text-sm text-destaque" role="alert">{erro}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn btn-suave" onClick={aoFechar}>Cancelar</button>
          <button className="btn flex-1">Salvar</button>
        </div>
      </form>
    </Folha>
  )
}
