import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import {
  atualizarAtividade, atualizarCuidado, atualizarItemLista, criarAtividade, criarAtividades, criarCuidados, criarItemLista,
  tabInserir, tabListar,
  definirOcorrencia, excluirCuidado, excluirDefinitivo, excluirItensLista,
  listarAreas, listarAtividades, listarCuidados, listarItensLista, listarOcorrencias,
} from './dados'
import type { Area, Atividade, Cuidado, Energia, EstadoOcorrencia, ItemLista, MarcaEnergia, NivelEnergia, NovaAtividade, NovoCuidado, Ocorrencia, Pausa, Viagem } from './tipos'
import { hojeISO } from './datas'

interface Ctx {
  sessao: Session | null
  carregandoSessao: boolean
  carregando: boolean
  nome: string
  areas: Area[]
  atividades: Atividade[]
  ocorrencias: Ocorrencia[]
  erro: string | null
  recarregar: () => Promise<void>
  criar: (n: NovaAtividade) => Promise<void>
  atualizar: (id: string, p: Partial<Atividade>) => Promise<void>
  excluirParaSempre: (id: string) => Promise<void>
  marcarOcorrencia: (atividadeId: string, dia: string, estado: EstadoOcorrencia) => Promise<void>
  cuidados: Cuidado[]
  itensLista: ItemLista[]
  criarCuidadosEmLote: (novos: NovoCuidado[]) => Promise<void>
  atualizarCuidadoPorId: (id: string, p: Partial<Cuidado>) => Promise<void>
  excluirCuidadoPorId: (id: string) => Promise<void>
  adicionarItemLista: (areaId: string | null, nome: string) => Promise<void>
  atualizarItem: (id: string, p: Partial<ItemLista>) => Promise<void>
  removerItens: (ids: string[]) => Promise<void>
  // Etapa 5
  /** false enquanto o etapa5.sql não foi rodado no Supabase */
  etapa5: boolean
  energias: Energia[]
  pausas: Pausa[]
  viagens: Viagem[]
  registrarEnergia: (nivel: NivelEnergia, marcas: MarcaEnergia[]) => Promise<void>
  criarVarias: (lista: NovaAtividade[]) => Promise<boolean>
  recarregarViagens: () => Promise<void>
}

const Contexto = createContext<Ctx | null>(null)

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregandoSessao, setCarregandoSessao] = useState(!!supabase)
  const [carregando, setCarregando] = useState(true)
  const [areas, setAreas] = useState<Area[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [cuidados, setCuidados] = useState<Cuidado[]>([])
  const [itensLista, setItensLista] = useState<ItemLista[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [etapa5, setEtapa5] = useState(true)
  const [energias, setEnergias] = useState<Energia[]>([])
  const [pausas, setPausas] = useState<Pausa[]>([])
  const [viagens, setViagens] = useState<Viagem[]>([])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregandoSessao(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_ev, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const logado = !supabase || !!sessao

  const recarregar = useCallback(async () => {
    try {
      const [a, t, o] = await Promise.all([listarAreas(), listarAtividades(), listarOcorrencias()])
      setAreas(a)
      setAtividades(t)
      setOcorrencias(o)
      // Etapa 3: se ainda não rodou o etapa3.sql no Supabase, só estas duas telas ficam vazias.
      const [c, l] = await Promise.all([listarCuidados().catch(() => [] as Cuidado[]), listarItensLista().catch(() => [] as ItemLista[])])
      setCuidados(c)
      setItensLista(l)
      // Etapa 5: sem o etapa5.sql o app segue funcionando, só sem energia/viagens salvas na nuvem.
      try {
        const [e, p, v] = await Promise.all([tabListar<Energia>('energia'), tabListar<Pausa>('pausas'), tabListar<Viagem>('viagens')])
        setEnergias(e)
        setPausas(p)
        setViagens(v)
        setEtapa5(true)
      } catch {
        setEtapa5(false)
      }
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui carregar seus dados.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (logado) void recarregar()
  }, [logado, recarregar])

  const criar = useCallback(
    async (n: NovaAtividade) => {
      await criarAtividade(n)
      await recarregar()
    },
    [recarregar],
  )

  // As ações abaixo atualizam a tela na hora (otimista) e salvam em seguida.
  const atualizar = useCallback(
    async (id: string, p: Partial<Atividade>) => {
      setAtividades((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)))
      try {
        await atualizarAtividade(id, p)
      } catch {
        setErro('Não consegui salvar essa mudança. Confira a internet e tente de novo.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const excluirParaSempre = useCallback(
    async (id: string) => {
      setAtividades((prev) => prev.filter((x) => x.id !== id))
      try {
        await excluirDefinitivo(id)
      } catch {
        setErro('Não consegui excluir agora.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const marcarOcorrencia = useCallback(
    async (atividadeId: string, dia: string, estado: EstadoOcorrencia) => {
      setOcorrencias((prev) => {
        const resto = prev.filter((o) => !(o.atividade_id === atividadeId && o.dia === dia))
        if (estado === null) return resto
        const ts = new Date().toISOString()
        return [
          ...resto,
          { id: `tmp-${atividadeId}-${dia}`, atividade_id: atividadeId, dia, feito: estado === 'feita', feito_em: estado === 'feita' ? ts : null, created_at: ts },
        ]
      })
      try {
        await definirOcorrencia(atividadeId, dia, estado)
      } catch {
        setErro('Não consegui salvar essa mudança. Confira a internet e tente de novo.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const criarCuidadosEmLote = useCallback(
    async (novos: NovoCuidado[]) => {
      try {
        await criarCuidados(novos)
      } catch {
        setErro('Não consegui salvar. Você já rodou o etapa3.sql no Supabase?')
      }
      await recarregar()
    },
    [recarregar],
  )

  const atualizarCuidadoPorId = useCallback(
    async (id: string, p: Partial<Cuidado>) => {
      setCuidados((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)))
      try {
        await atualizarCuidado(id, p)
      } catch {
        setErro('Não consegui salvar essa mudança. Confira a internet e tente de novo.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const excluirCuidadoPorId = useCallback(
    async (id: string) => {
      setCuidados((prev) => prev.filter((x) => x.id !== id))
      try {
        await excluirCuidado(id)
      } catch {
        setErro('Não consegui excluir agora.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const adicionarItemLista = useCallback(
    async (areaId: string | null, nomeItem: string) => {
      try {
        await criarItemLista(areaId, nomeItem)
      } catch {
        setErro('Não consegui salvar. Você já rodou o etapa3.sql no Supabase?')
      }
      await recarregar()
    },
    [recarregar],
  )

  const atualizarItem = useCallback(
    async (id: string, p: Partial<ItemLista>) => {
      setItensLista((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)))
      try {
        await atualizarItemLista(id, p)
      } catch {
        setErro('Não consegui salvar essa mudança. Confira a internet e tente de novo.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const removerItens = useCallback(
    async (ids: string[]) => {
      setItensLista((prev) => prev.filter((x) => !ids.includes(x.id)))
      try {
        await excluirItensLista(ids)
      } catch {
        setErro('Não consegui excluir agora.')
        await recarregar()
      }
    },
    [recarregar],
  )

  const registrarEnergia = useCallback(
    async (nivel: NivelEnergia, marcas: MarcaEnergia[]) => {
      const linha = { dia: hojeISO(), nivel, marcas }
      const tmp: Energia = { ...linha, id: `tmp-${Date.now()}`, created_at: new Date().toISOString() }
      setEnergias((prev) => [...prev, tmp])
      try {
        const nova = await tabInserir<Energia>('energia', linha)
        setEnergias((prev) => prev.map((x) => (x.id === tmp.id ? nova : x)))
      } catch {
        // sem o etapa5.sql: guarda só neste aparelho para o dia de hoje
        try {
          localStorage.setItem('miaulife-energia-hoje', JSON.stringify(tmp))
        } catch {
          /* segue */
        }
      }
    },
    [],
  )

  const criarVarias = useCallback(
    async (lista: NovaAtividade[]) => {
      try {
        await criarAtividades(lista)
        await recarregar()
        return true
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        setErro(
          /column|coluna|schema/i.test(msg)
            ? 'Para guardar tempo, esforço e micropassos, falta rodar o etapa5.sql no Supabase.'
            : 'Não consegui salvar agora. Confira a internet e tente de novo.',
        )
        return false
      }
    },
    [recarregar],
  )

  const recarregarViagens = useCallback(async () => {
    try {
      const [p, v] = await Promise.all([tabListar<Pausa>('pausas'), tabListar<Viagem>('viagens')])
      setPausas(p)
      setViagens(v)
    } catch {
      /* etapa5 ainda não rodou */
    }
  }, [])

  // Energia guardada só no aparelho (antes do etapa5.sql) continua valendo no mesmo dia
  useEffect(() => {
    if (etapa5) return
    try {
      const v = localStorage.getItem('miaulife-energia-hoje')
      const e = v ? (JSON.parse(v) as Energia) : null
      if (e && e.dia === hojeISO()) setEnergias((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]))
    } catch {
      /* segue */
    }
  }, [etapa5])

  const nome = (sessao?.user.user_metadata?.nome as string | undefined) || localStorage.getItem('miaulife-nome') || 'Thaís'

  const valor = useMemo(
    () => ({ sessao, carregandoSessao, carregando, nome, areas, atividades, ocorrencias, erro, recarregar, criar, atualizar, excluirParaSempre, marcarOcorrencia, cuidados, itensLista, criarCuidadosEmLote, atualizarCuidadoPorId, excluirCuidadoPorId, adicionarItemLista, atualizarItem, removerItens, etapa5, energias, pausas, viagens, registrarEnergia, criarVarias, recarregarViagens }),
    [sessao, carregandoSessao, carregando, nome, areas, atividades, ocorrencias, erro, recarregar, criar, atualizar, excluirParaSempre, marcarOcorrencia, cuidados, itensLista, criarCuidadosEmLote, atualizarCuidadoPorId, excluirCuidadoPorId, adicionarItemLista, atualizarItem, removerItens, etapa5, energias, pausas, viagens, registrarEnergia, criarVarias, recarregarViagens],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useApp() {
  const c = useContext(Contexto)
  if (!c) throw new Error('useApp fora do provedor')
  return c
}
