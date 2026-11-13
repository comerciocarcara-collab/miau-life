import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTabela } from '../../lib/useTabela'
import { SEMANA_SEG } from '../../lib/datas'
import type { Exercicio, Treino } from '../../lib/tipos'
import Folha from '../Folha'
import { Chip, Erro } from './comum'

// SEMANA_SEG começa na segunda; o banco usa 0=Dom ... 6=Sáb
const VALOR_DIA = [1, 2, 3, 4, 5, 6, 0]

export const textoDias = (d: number[] | null) =>
  !d || d.length === 0 ? 'Sem dia fixo' : [...d].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((x) => SEMANA_SEG[VALOR_DIA.indexOf(x)]).join(' · ')

export default function Treinos() {
  const treinos = useTabela<Treino>('treinos')
  const [editando, setEditando] = useState<Treino | 'novo' | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <Erro texto={treinos.erro} />
      <button className="btn" onClick={() => setEditando('novo')}><Plus size={18} /> Novo treino</button>
      {treinos.itens.length === 0 ? (
        <p className="cartao m-0 p-5 text-center text-sm text-suave">Monte seus treinos (Treino A, Pernas, Cardio…) com os exercícios, séries e cargas. Dá para escolher os dias da semana.</p>
      ) : (
        treinos.itens.map((t) => (
          <button key={t.id} className="cartao flex flex-col gap-1 border-0 p-4 text-left" onClick={() => setEditando(t)}>
            <span className="text-lg font-extrabold">{t.nome}</span>
            <span className="text-xs font-bold text-suave">{textoDias(t.dias_semana)}</span>
            {t.exercicios.length > 0 && (
              <ul className="m-0 mt-1 list-none p-0 text-sm">
                {t.exercicios.map((e, i) => (
                  <li key={i} className="flex justify-between gap-2 py-0.5">
                    <span>{e.nome}</span>
                    <span className="text-suave">{[e.series && e.reps ? `${e.series}×${e.reps}` : e.series || e.reps, e.carga].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </button>
        ))
      )}

      {editando && (
        <FormTreino
          treino={editando === 'novo' ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async (d) => {
            if (editando === 'novo') await treinos.adicionar(d as Omit<Treino, 'id' | 'created_at'>)
            else await treinos.atualizar(editando.id, d)
            setEditando(null)
          }}
          aoExcluir={async () => {
            if (editando !== 'novo' && confirm(`Excluir o treino “${editando.nome}”? Os dias já marcados como feitos também somem.`)) {
              await treinos.remover(editando.id)
              setEditando(null)
            }
          }}
        />
      )}
    </div>
  )
}

const VAZIO: Exercicio = { nome: '', series: '', reps: '', carga: '' }

function FormTreino({
  treino, aoFechar, aoSalvar, aoExcluir,
}: {
  treino: Treino | null
  aoFechar: () => void
  aoSalvar: (d: Partial<Treino>) => Promise<void>
  aoExcluir: () => Promise<void>
}) {
  const [nome, setNome] = useState(treino?.nome ?? '')
  const [dias, setDias] = useState<number[]>(treino?.dias_semana ?? [])
  const [ex, setEx] = useState<Exercicio[]>(treino?.exercicios?.length ? treino.exercicios : [{ ...VAZIO }])
  const [erro, setErro] = useState<string | null>(null)

  const mudar = (i: number, p: Partial<Exercicio>) => setEx(ex.map((x, k) => (k === i ? { ...x, ...p } : x)))

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Dê um nome ao treino.')
    await aoSalvar({
      nome: nome.trim(),
      dias_semana: dias.length ? dias : null,
      exercicios: ex.filter((x) => x.nome.trim()).map((x) => ({ nome: x.nome.trim(), series: x.series.trim(), reps: x.reps.trim(), carga: x.carga.trim() })),
    })
  }

  return (
    <Folha titulo={treino ? 'Editar treino' : 'Novo treino'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div>
          <label className="rotulo" htmlFor="tr-nome">Nome</label>
          <input id="tr-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Treino A – Pernas" autoFocus />
        </div>
        <div>
          <span className="rotulo">Quais dias? (pode deixar vazio)</span>
          <div className="flex flex-wrap gap-2">
            {SEMANA_SEG.map((nomeDia, i) => {
              const v = VALOR_DIA[i]
              const on = dias.includes(v)
              return <Chip key={nomeDia} ativo={on} aoClicar={() => setDias(on ? dias.filter((d) => d !== v) : [...dias, v])}>{nomeDia}</Chip>
            })}
          </div>
        </div>
        <div>
          <span className="rotulo">Exercícios</span>
          <div className="flex flex-col gap-3">
            {ex.map((x, i) => (
              <div key={i} className="rounded-2xl border border-borda p-3">
                <div className="flex gap-2">
                  <input className="campo" aria-label={`Exercício ${i + 1}`} value={x.nome} onChange={(e) => mudar(i, { nome: e.target.value })} placeholder="Ex.: Agachamento" />
                  {ex.length > 1 && (
                    <button type="button" aria-label={`Tirar exercício ${i + 1}`} className="grid h-12 w-10 shrink-0 place-items-center border-0 bg-transparent text-suave" onClick={() => setEx(ex.filter((_, k) => k !== i))}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input className="campo" aria-label="Séries" inputMode="numeric" value={x.series} onChange={(e) => mudar(i, { series: e.target.value })} placeholder="Séries" />
                  <input className="campo" aria-label="Repetições" value={x.reps} onChange={(e) => mudar(i, { reps: e.target.value })} placeholder="Reps" />
                  <input className="campo" aria-label="Carga" value={x.carga} onChange={(e) => mudar(i, { carga: e.target.value })} placeholder="Carga" />
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-suave" onClick={() => setEx([...ex, { ...VAZIO }])}><Plus size={17} /> Outro exercício</button>
          </div>
        </div>
        {erro && <p className="m-0 text-sm text-destaque" role="alert">{erro}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn btn-suave" onClick={aoFechar}>Cancelar</button>
          <button className="btn flex-1">Salvar</button>
        </div>
        {treino && <button type="button" className="border-0 bg-transparent text-sm font-bold text-suave" onClick={() => void aoExcluir()}>Excluir este treino</button>}
      </form>
    </Folha>
  )
}
