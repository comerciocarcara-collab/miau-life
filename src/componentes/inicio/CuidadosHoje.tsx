import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useApp } from '../../lib/ContextoApp'
import { situacao } from '../../lib/cuidados'
import { metasDaSemana } from '../../lib/agenda'
import { diasEntre } from '../../lib/datas'
import type { Cuidado, NivelEnergia } from '../../lib/tipos'

interface Linha {
  chave: string
  nome: string
  texto: string
  tom: 'verde' | 'pessego' | 'lilas' | 'neutro'
  atencao: boolean
  acao: { rotulo: string; fazer: () => void; suave?: boolean } | null
  selo: string | null
}

function tempo(dias: number): string {
  if (dias === 1) return '1 dia'
  if (dias % 7 === 0 && dias < 60) return dias === 7 ? '1 semana' : `${dias / 7} semanas`
  if (dias >= 30 && dias % 30 === 0) return dias === 30 ? '1 mês' : `${dias / 30} meses`
  return `${dias} dias`
}

function textoCuidado(c: Cuidado, hoje: string): { texto: string; atencao: boolean } {
  const s = situacao(c, hoje)
  if (s.estado === 'nunca') return { texto: 'sem registro ainda', atencao: true }
  const desde = diasEntre(c.ultima_em as string, hoje)
  if (s.estado === 'atrasado') return { texto: `pede carinho, já passou ${tempo(desde)}`, atencao: true }
  if (s.estado === 'hoje') return { texto: 'é hoje, no seu tempo', atencao: true }
  const feito = desde === 0 ? 'feito hoje' : `feito há ${tempo(desde)}`
  const prox = s.dias === 1 ? 'próximo amanhã' : `próximo em ${s.dias}`
  return { texto: `${feito}, ${prox}`, atencao: false }
}

/** "Cuidados de hoje": autocuidado (área Pessoal) + metas da semana da Vida Fit, um toque cada. */
export default function CuidadosHoje({ hoje, nivel }: { hoje: string; nivel: NivelEnergia | null }) {
  const { areas, cuidados, atividades, ocorrencias, atualizarCuidadoPorId, marcarOcorrencia } = useApp()
  const pessoal = areas.find((a) => a.chave === 'pessoal' && !a.arquivada)
  const fit = areas.find((a) => a.chave === 'fit' && !a.arquivada)
  const baixa = nivel === 'baixa'

  const linhas = useMemo(() => {
    const out: Linha[] = []
    for (const c of cuidados) {
      if (!c.ativo || !pessoal || c.area_id !== pessoal.id) continue
      const { texto, atencao } = textoCuidado(c, hoje)
      const feitoHoje = c.ultima_em === hoje
      const minimo = baixa && atencao && c.versao_minima ? `hoje, só: ${c.versao_minima}` : null
      out.push({
        chave: c.id,
        nome: c.nome,
        texto: minimo ?? texto,
        tom: atencao ? 'pessego' : 'verde',
        atencao,
        acao: feitoHoje
          ? { rotulo: 'Desfazer', suave: true, fazer: () => void atualizarCuidadoPorId(c.id, { ultima_em: c.anterior_em, anterior_em: null }) }
          : atencao
            ? { rotulo: 'Fiz', fazer: () => void atualizarCuidadoPorId(c.id, { ultima_em: hoje, anterior_em: c.ultima_em }) }
            : null,
        selo: atencao || feitoHoje ? null : 'Em dia',
      })
    }
    const { metas } = metasDaSemana(hoje, atividades, ocorrencias)
    for (const m of metas) {
      if (!fit || m.atividade.area_id !== fit.id) continue
      const hojeFeito = ocorrencias.some((o) => o.atividade_id === m.atividade.id && o.dia === hoje && o.feito)
      const cumprida = m.feitas >= m.meta
      out.push({
        chave: m.atividade.id,
        nome: m.atividade.titulo,
        texto: m.feitas === 0 ? '0 nesta semana, sem pressa' : cumprida ? `${m.feitas} de ${m.meta}: meta da semana feita!` : `${m.feitas} de ${m.meta} nesta semana`,
        tom: cumprida ? 'verde' : m.feitas === 0 ? 'neutro' : 'lilas',
        atencao: !cumprida,
        acao: hojeFeito
          ? { rotulo: 'Desfazer', suave: true, fazer: () => void marcarOcorrencia(m.atividade.id, hoje, null) }
          : cumprida
            ? null
            : { rotulo: 'Fui', suave: m.feitas === 0, fazer: () => void marcarOcorrencia(m.atividade.id, hoje, 'feita') },
        selo: cumprida && !hojeFeito ? 'Em dia' : null,
      })
    }
    // o que pede atenção primeiro; o resto mantém a ordem de cadastro
    return out.sort((a, b) => Number(b.atencao) - Number(a.atencao)).slice(0, 6)
  }, [cuidados, atividades, ocorrencias, pessoal, fit, hoje, baixa, atualizarCuidadoPorId, marcarOcorrencia])

  if (linhas.length === 0) {
    return (
      <div className="cartao flex flex-col gap-2 p-4">
        <p className="m-0 font-extrabold">Cuidados de hoje</p>
        <p className="m-0 text-sm text-suave">Cabelo, unhas, skincare, academia… Cadastre seus cuidados e eles aparecem aqui com um toque para marcar.</p>
        {pessoal && (
          <Link to={`/area/${pessoal.id}`} className="btn btn-suave !min-h-11 self-start text-sm no-underline">
            <Plus size={16} /> Criar meus cuidados
          </Link>
        )}
      </div>
    )
  }

  return (
    <section aria-label="Cuidados de hoje" className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[15px]">Cuidados de hoje</h2>
        {pessoal && (
          <Link to={`/area/${pessoal.id}`} className="text-sm font-bold text-suave no-underline">
            ver todos
          </Link>
        )}
      </div>
      {linhas.map((l) => (
        <div
          key={l.chave}
          className={`flex min-h-14 items-center gap-2.5 rounded-2xl py-1.5 pl-3.5 pr-2 ${l.tom === 'neutro' ? 'border-2 border-borda bg-cartao' : `tom cor-${l.tom}`}`}
        >
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[15px] font-extrabold">{l.nome}</div>
            <div className={`text-[13px] font-semibold ${l.tom === 'neutro' ? 'text-suave' : ''}`}>{l.texto}</div>
          </div>
          {l.acao ? (
            <button
              onClick={l.acao.fazer}
              className={`btn !min-h-11 shrink-0 !rounded-xl !px-4 text-sm ${l.acao.suave ? 'btn-suave' : ''}`}
            >
              {l.acao.rotulo}
            </button>
          ) : (
            l.selo && <span className="flex min-h-11 min-w-11 shrink-0 items-center justify-center px-1 text-[13px] font-extrabold">{l.selo}</span>
          )}
        </div>
      ))}
      {baixa && <p className="m-0 mt-1 text-[13px] text-suave">Energia baixa hoje? O app mostra a versão mínima de cada cuidado.</p>}
    </section>
  )
}
