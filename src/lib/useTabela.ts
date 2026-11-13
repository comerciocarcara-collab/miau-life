import { useCallback, useEffect, useRef, useState } from 'react'
import { tabAtualizar, tabInserir, tabListar, tabRemover } from './dados'
import { useApp } from './ContextoApp'
import { modoDemo } from './supabase'

const AVISO = 'Não consegui salvar. Confira a internet e se o arquivo .sql desta etapa já foi rodado no Supabase.'

/** Carrega e edita uma tabela simples. A tela muda na hora e salva em seguida. */
export function useTabela<T extends { id: string }>(tabela: string, ordem?: (a: T, b: T) => number) {
  const { sessao } = useApp()
  const logado = modoDemo || !!sessao
  const [itens, setItens] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const ordemRef = useRef(ordem)
  ordemRef.current = ordem

  const ordenar = useCallback((l: T[]) => (ordemRef.current ? [...l].sort(ordemRef.current) : l), [])

  const recarregar = useCallback(async () => {
    try {
      setItens(ordenar(await tabListar<T>(tabela)))
      setErro(null)
    } catch {
      setErro('Não consegui carregar. Se for a primeira vez nesta área, falta rodar o arquivo .sql da etapa no Supabase.')
    } finally {
      setCarregando(false)
    }
  }, [tabela, ordenar])

  useEffect(() => {
    if (logado) void recarregar()
  }, [logado, recarregar])

  const adicionar = useCallback(
    async (linha: Omit<T, 'id' | 'created_at'>): Promise<T | null> => {
      try {
        const nova = await tabInserir<T>(tabela, linha)
        setItens((p) => ordenar([...p, nova]))
        setErro(null)
        return nova
      } catch {
        setErro(AVISO)
        return null
      }
    },
    [tabela, ordenar],
  )

  const atualizar = useCallback(
    async (id: string, patch: Partial<T>) => {
      setItens((p) => ordenar(p.map((x) => (x.id === id ? { ...x, ...patch } : x))))
      try {
        await tabAtualizar<T>(tabela, id, patch)
      } catch {
        setErro(AVISO)
        await recarregar()
      }
    },
    [tabela, ordenar, recarregar],
  )

  const remover = useCallback(
    async (id: string) => {
      setItens((p) => p.filter((x) => x.id !== id))
      try {
        await tabRemover<T>(tabela, id)
      } catch {
        setErro('Não consegui excluir agora.')
        await recarregar()
      }
    },
    [tabela, recarregar],
  )

  return { itens, carregando, erro, adicionar, atualizar, remover, recarregar }
}
