import { useMemo, useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useTabela } from '../../lib/useTabela'
import { dataCurta, hojeISO } from '../../lib/datas'
import type { FitPerfil, Medida } from '../../lib/tipos'
import Folha from '../Folha'
import { Erro, fmt, numero } from './comum'

const CAMPOS: { chave: 'peso_kg' | 'cintura_cm' | 'quadril_cm' | 'braco_cm' | 'coxa_cm'; nome: string; un: string }[] = [
  { chave: 'peso_kg', nome: 'Peso', un: 'kg' },
  { chave: 'cintura_cm', nome: 'Cintura', un: 'cm' },
  { chave: 'quadril_cm', nome: 'Quadril', un: 'cm' },
  { chave: 'braco_cm', nome: 'Braço', un: 'cm' },
  { chave: 'coxa_cm', nome: 'Coxa', un: 'cm' },
]

export default function Medidas() {
  const medidas = useTabela<Medida>('medidas', (a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : a.created_at.localeCompare(b.created_at)))
  const perfil = useTabela<FitPerfil>('fit_perfil')
  const [editando, setEditando] = useState<Medida | 'nova' | null>(null)
  const [editMeta, setEditMeta] = useState(false)
  const meta = perfil.itens[0]?.meta_peso_kg ?? null

  const lista = [...medidas.itens].reverse()
  const pesos = useMemo(() => medidas.itens.filter((m) => m.peso_kg !== null).slice(-12), [medidas.itens])
  const primeiro = pesos[0]?.peso_kg ?? null
  const atual = pesos[pesos.length - 1]?.peso_kg ?? null
  const variacao = primeiro !== null && atual !== null && pesos.length > 1 ? atual - primeiro : null

  return (
    <div className="flex flex-col gap-4">
      <Erro texto={medidas.erro ?? perfil.erro} />

      <div className="grid grid-cols-2 gap-3">
        <div className="cartao flex flex-col gap-1 p-4">
          <span className="text-sm text-suave">Peso atual</span>
          <span className="font-display text-3xl font-semibold">{atual === null ? '—' : `${fmt(atual)} kg`}</span>
          {variacao !== null && (
            <span className="text-xs text-suave">
              {variacao === 0 ? 'Igual ao início' : `${variacao > 0 ? '+' : '−'}${fmt(Math.abs(variacao))} kg desde o início`}
            </span>
          )}
        </div>
        <button className="cartao flex flex-col items-start gap-1 border-0 p-4 text-left" onClick={() => setEditMeta(true)} aria-label="Definir meta de peso">
          <span className="flex items-center gap-1 text-sm text-suave"><Target size={15} /> Minha meta</span>
          <span className="font-display text-3xl font-semibold">{meta === null ? '—' : `${fmt(meta)} kg`}</span>
          <span className="text-xs text-suave">{meta === null ? 'Toque para definir' : 'Toque para mudar'}</span>
        </button>
      </div>

      <button className="btn" onClick={() => setEditando('nova')}><Plus size={18} /> Nova medição</button>

      {pesos.length > 1 && <GraficoPeso pontos={pesos} meta={meta} />}

      <section className="flex flex-col gap-2" aria-label="Histórico">
        <h2 className="m-0 text-lg font-semibold text-titulo">Histórico</h2>
        {lista.length === 0 ? (
          <p className="cartao m-0 p-5 text-center text-sm text-suave">Anote seu peso e suas medidas de vez em quando. O gráfico aparece aqui.</p>
        ) : (
          lista.map((m) => (
            <button key={m.id} className="cartao flex flex-col gap-1 border-0 p-3 text-left" onClick={() => setEditando(m)}>
              <span className="font-extrabold">{dataCurta(m.dia)}</span>
              <span className="text-sm text-suave">
                {CAMPOS.filter((c) => m[c.chave] !== null).map((c) => `${c.nome} ${fmt(m[c.chave])} ${c.un}`).join(' · ') || 'Sem números'}
              </span>
              {m.nota && <span className="text-sm">{m.nota}</span>}
            </button>
          ))
        )}
      </section>

      {editando && (
        <FormMedida
          medida={editando === 'nova' ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async (dados) => {
            if (editando === 'nova') await medidas.adicionar(dados as Omit<Medida, 'id' | 'created_at'>)
            else await medidas.atualizar(editando.id, dados)
            setEditando(null)
          }}
          aoExcluir={async () => {
            if (editando !== 'nova' && confirm('Excluir esta medição? Isso não pode ser desfeito.')) {
              await medidas.remover(editando.id)
              setEditando(null)
            }
          }}
        />
      )}
      {editMeta && (
        <FormMeta
          atual={meta}
          aoFechar={() => setEditMeta(false)}
          aoSalvar={async (v) => {
            const p = perfil.itens[0]
            if (p) await perfil.atualizar(p.id, { meta_peso_kg: v })
            else await perfil.adicionar({ meta_agua_ml: 2000, meta_peso_kg: v })
            setEditMeta(false)
          }}
        />
      )}
    </div>
  )
}

function GraficoPeso({ pontos, meta }: { pontos: Medida[]; meta: number | null }) {
  const valores = pontos.map((p) => p.peso_kg as number)
  const todos = meta !== null ? [...valores, meta] : valores
  const min = Math.min(...todos) - 1
  const max = Math.max(...todos) + 1
  const x = (i: number) => 24 + (i * 272) / Math.max(1, pontos.length - 1)
  const y = (v: number) => 120 - ((v - min) / (max - min)) * 100
  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.peso_kg as number).toFixed(1)}`).join(' ')
  return (
    <section className="cartao p-4" aria-label="Gráfico de peso">
      <h2 className="m-0 mb-2 text-lg font-semibold text-titulo">Peso ao longo do tempo</h2>
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label={`Peso: ${pontos.map((p) => `${dataCurta(p.dia)} ${fmt(p.peso_kg)} kg`).join(', ')}`}>
        {meta !== null && (
          <>
            <line x1="14" x2="306" y1={y(meta)} y2={y(meta)} stroke="var(--cf-verde, #34b27b)" strokeWidth="2" strokeDasharray="6 5" />
            <text x="306" y={y(meta) - 5} textAnchor="end" fontSize="11" fill="var(--c-suave)">meta {fmt(meta)}</text>
          </>
        )}
        <path d={linha} fill="none" stroke="var(--cf-presenca)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <g key={p.id}>
            <circle cx={x(i)} cy={y(p.peso_kg as number)} r="4.5" fill="var(--cf-presenca)" />
            {(i === 0 || i === pontos.length - 1) && (
              <text x={x(i)} y={y(p.peso_kg as number) - 10} textAnchor={i === 0 ? 'start' : 'end'} fontSize="12" fontWeight="800" fill="var(--c-texto)">{fmt(p.peso_kg)}</text>
            )}
            {(i === 0 || i === pontos.length - 1 || pontos.length <= 6) && (
              <text x={x(i)} y="144" textAnchor="middle" fontSize="10" fill="var(--c-suave)">{dataCurta(p.dia)}</text>
            )}
          </g>
        ))}
      </svg>
    </section>
  )
}

function FormMedida({
  medida, aoFechar, aoSalvar, aoExcluir,
}: {
  medida: Medida | null
  aoFechar: () => void
  aoSalvar: (d: Partial<Medida>) => Promise<void>
  aoExcluir: () => Promise<void>
}) {
  const hoje = hojeISO()
  const [dia, setDia] = useState(medida?.dia ?? hoje)
  const [v, setV] = useState<Record<string, string>>(
    Object.fromEntries(CAMPOS.map((c) => [c.chave, medida?.[c.chave] != null ? String(medida[c.chave]) : ''])),
  )
  const [nota, setNota] = useState(medida?.nota ?? '')
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!dia) return setErro('Escolha o dia.')
    if (dia > hoje) return setErro('O dia não pode ser no futuro.')
    const nums: Record<string, number | null> = {}
    for (const c of CAMPOS) {
      const n = numero(v[c.chave])
      if (n !== null && (n <= 0 || n > 500)) return setErro(`Confira o valor de ${c.nome.toLowerCase()}.`)
      nums[c.chave] = n
    }
    if (Object.values(nums).every((n) => n === null)) return setErro('Preencha pelo menos um número.')
    await aoSalvar({ dia, ...nums, nota: nota.trim() || null })
  }

  return (
    <Folha titulo={medida ? 'Editar medição' : 'Nova medição'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div>
          <label className="rotulo" htmlFor="me-dia">Dia</label>
          <input id="me-dia" type="date" max={hoje} className="campo" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CAMPOS.map((c) => (
            <div key={c.chave}>
              <label className="rotulo" htmlFor={`me-${c.chave}`}>{c.nome} ({c.un})</label>
              <input id={`me-${c.chave}`} inputMode="decimal" className="campo" value={v[c.chave]} onChange={(e) => setV({ ...v, [c.chave]: e.target.value })} placeholder="—" />
            </div>
          ))}
        </div>
        <div>
          <label className="rotulo" htmlFor="me-nota">Anotação (opcional)</label>
          <input id="me-nota" className="campo" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
        {erro && <p className="m-0 text-sm text-destaque" role="alert">{erro}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn btn-suave" onClick={aoFechar}>Cancelar</button>
          <button className="btn flex-1">Salvar</button>
        </div>
        {medida && <button type="button" className="border-0 bg-transparent text-sm font-bold text-suave" onClick={() => void aoExcluir()}>Excluir esta medição</button>}
      </form>
    </Folha>
  )
}

function FormMeta({ atual, aoFechar, aoSalvar }: { atual: number | null; aoFechar: () => void; aoSalvar: (v: number | null) => Promise<void> }) {
  const [v, setV] = useState(atual === null ? '' : String(atual))
  const [erro, setErro] = useState<string | null>(null)
  return (
    <Folha titulo="Meta de peso" aoFechar={aoFechar}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const n = numero(v)
          if (n !== null && (n < 20 || n > 400)) return setErro('Confira o valor.')
          await aoSalvar(n)
        }}
      >
        <div>
          <label className="rotulo" htmlFor="meta-peso">Peso que você quer alcançar (kg). Deixe vazio para não ter meta.</label>
          <input id="meta-peso" inputMode="decimal" className="campo" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
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
