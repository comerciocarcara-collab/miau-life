import { useMemo, useState } from 'react'
import { Heart, Plus, Search } from 'lucide-react'
import { useTabela } from '../../lib/useTabela'
import type { Receita } from '../../lib/tipos'
import Folha from '../Folha'
import { Chip, Erro } from './comum'

const REFEICOES = ['Café da manhã', 'Almoço', 'Jantar', 'Lanche', 'Sobremesa']

export default function Receitas() {
  const receitas = useTabela<Receita>('receitas', (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<string>('todas')
  const [editando, setEditando] = useState<Receita | 'nova' | null>(null)

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return receitas.itens.filter(
      (r) =>
        (filtro === 'todas' || (filtro === 'favoritas' ? r.favorita : r.refeicao === filtro)) &&
        (q === '' || `${r.nome} ${r.ingredientes ?? ''}`.toLowerCase().includes(q)),
    )
  }, [receitas.itens, busca, filtro])

  return (
    <div className="flex flex-col gap-3">
      <Erro texto={receitas.erro} />
      <button className="btn" onClick={() => setEditando('nova')}><Plus size={18} /> Nova receita</button>

      {receitas.itens.length > 0 && (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-suave" />
            <input className="campo !pl-11" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou ingrediente" aria-label="Buscar receita" />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {['todas', 'favoritas', ...REFEICOES].map((f) => (
              <Chip key={f} ativo={filtro === f} aoClicar={() => setFiltro(f)}>{f === 'todas' ? 'Todas' : f === 'favoritas' ? 'Favoritas' : f}</Chip>
            ))}
          </div>
        </>
      )}

      {receitas.itens.length === 0 ? (
        <p className="cartao m-0 p-5 text-center text-sm text-suave">Guarde aqui suas receitas fit: ingredientes, modo de preparo e as favoritas.</p>
      ) : visiveis.length === 0 ? (
        <p className="cartao m-0 p-5 text-center text-sm text-suave">Nenhuma receita encontrada.</p>
      ) : (
        visiveis.map((r) => (
          <div key={r.id} className="cartao flex items-center gap-2 p-3">
            <button className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left" onClick={() => setEditando(r)}>
              <span className="block font-extrabold leading-tight">{r.nome}</span>
              <span className="text-xs text-suave">{r.refeicao}</span>
            </button>
            <button
              aria-label={r.favorita ? `Tirar ${r.nome} das favoritas` : `Favoritar ${r.nome}`}
              aria-pressed={r.favorita}
              className="grid h-10 w-10 place-items-center border-0 bg-transparent"
              onClick={() => void receitas.atualizar(r.id, { favorita: !r.favorita })}
            >
              <Heart size={22} className={r.favorita ? 'fill-rosa text-destaque' : 'text-suave'} />
            </button>
          </div>
        ))
      )}

      {editando && (
        <FormReceita
          receita={editando === 'nova' ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async (d) => {
            if (editando === 'nova') await receitas.adicionar({ ...d, favorita: false } as Omit<Receita, 'id' | 'created_at'>)
            else await receitas.atualizar(editando.id, d)
            setEditando(null)
          }}
          aoExcluir={async () => {
            if (editando !== 'nova' && confirm(`Excluir a receita “${editando.nome}”? Isso não pode ser desfeito.`)) {
              await receitas.remover(editando.id)
              setEditando(null)
            }
          }}
        />
      )}
    </div>
  )
}

function FormReceita({
  receita, aoFechar, aoSalvar, aoExcluir,
}: {
  receita: Receita | null
  aoFechar: () => void
  aoSalvar: (d: Partial<Receita>) => Promise<void>
  aoExcluir: () => Promise<void>
}) {
  const [nome, setNome] = useState(receita?.nome ?? '')
  const [refeicao, setRefeicao] = useState(receita?.refeicao ?? 'Almoço')
  const [ing, setIng] = useState(receita?.ingredientes ?? '')
  const [prep, setPrep] = useState(receita?.preparo ?? '')
  const [erro, setErro] = useState<string | null>(null)

  return (
    <Folha titulo={receita ? 'Receita' : 'Nova receita'} aoFechar={aoFechar}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!nome.trim()) return setErro('Dê um nome à receita.')
          await aoSalvar({ nome: nome.trim(), refeicao, ingredientes: ing.trim() || null, preparo: prep.trim() || null })
        }}
      >
        <div>
          <label className="rotulo" htmlFor="rc-nome">Nome</label>
          <input id="rc-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Panqueca de banana" autoFocus={!receita} />
        </div>
        <div>
          <label className="rotulo" htmlFor="rc-ref">Refeição</label>
          <select id="rc-ref" className="campo" value={refeicao} onChange={(e) => setRefeicao(e.target.value)}>
            {REFEICOES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="rc-ing">Ingredientes (um por linha)</label>
          <textarea id="rc-ing" className="campo" rows={5} value={ing} onChange={(e) => setIng(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="rc-prep">Modo de preparo</label>
          <textarea id="rc-prep" className="campo" rows={6} value={prep} onChange={(e) => setPrep(e.target.value)} />
        </div>
        {erro && <p className="m-0 text-sm text-destaque" role="alert">{erro}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn btn-suave" onClick={aoFechar}>Cancelar</button>
          <button className="btn flex-1">Salvar</button>
        </div>
        {receita && <button type="button" className="border-0 bg-transparent text-sm font-bold text-suave" onClick={() => void aoExcluir()}>Excluir esta receita</button>}
      </form>
    </Folha>
  )
}
