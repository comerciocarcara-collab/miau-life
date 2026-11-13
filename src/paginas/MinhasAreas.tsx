import { Link } from 'react-router-dom'
import { Cat, ChartColumn, ChevronRight, Palette, Plane, Settings, WandSparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from '../lib/ContextoApp'
import { Icone, nomeIconeArea } from '../lib/icones'
import { infoPadrao } from '../lib/areasPadrao'
import { pendenciasDaArea } from '../lib/agenda'
import { quantosPrecisam } from '../lib/cuidados'
import { hojeISO } from '../lib/datas'

const ATALHOS: { to: string; rotulo: string; dica: string; icone: ReactNode }[] = [
  { to: '/importar', rotulo: 'Organizar com IA', dica: 'Despejar tudo e deixar organizado', icone: <WandSparkles size={22} /> },
  { to: '/viagem', rotulo: 'Viagem', dica: 'Voos, checklist e modo viagem', icone: <Plane size={22} /> },
  { to: '/evolucao', rotulo: 'Evolução', dica: 'O que você já fez nas últimas semanas', icone: <ChartColumn size={22} /> },
  { to: '/ia', rotulo: 'Miau IA', dica: 'Sua assistente (em breve)', icone: <Cat size={22} /> },
  { to: '/areas/editar', rotulo: 'Organizar áreas', dica: 'Nome, cor, ícone e ordem', icone: <Palette size={22} /> },
  { to: '/ajustes', rotulo: 'Ajustes', dica: 'Tema, nome e conta', icone: <Settings size={22} /> },
]

export default function MinhasAreas() {
  const { areas, atividades, ocorrencias, cuidados, carregando } = useApp()
  const hoje = hojeISO()
  const ativas = areas.filter((a) => !a.arquivada).sort((a, b) => a.posicao - b.posicao)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-[28px]">Áreas</h1>

      {ativas.length === 0 && !carregando && (
        <p className="cartao m-0 p-5 text-center text-suave">Você ainda não tem áreas. Crie a primeira em “Organizar áreas”.</p>
      )}

      <section aria-label="Minhas áreas" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ativas.map((a) => {
          const n = pendenciasDaArea(a.id, hoje, atividades, ocorrencias) + quantosPrecisam(cuidados, a.id, hoje)
          const info = infoPadrao(a.chave)
          return (
            <Link
              key={a.id}
              to={`/area/${a.id}`}
              className={`cartao-area cor-${a.cor} relative flex min-h-[120px] flex-col justify-between gap-2 p-3.5 no-underline`}
              style={{ color: 'inherit' }}
            >
              {n > 0 && (
                <span className="selo absolute right-2.5 top-2.5" aria-label={`${n} ${n === 1 ? 'coisa pede' : 'coisas pedem'} atenção`}>
                  {n}
                </span>
              )}
              <Icone nome={nomeIconeArea(a)} size={34} strokeWidth={1.9} className="icone-forte" />
              <span>
                <span className="block text-[15px] font-extrabold leading-tight">{a.nome}</span>
                <span className="mt-0.5 block text-xs leading-tight text-suave">{info?.curto ?? 'Sua área'}</span>
              </span>
            </Link>
          )
        })}
      </section>

      <section aria-label="Atalhos" className="flex flex-col gap-2">
        {ATALHOS.map((t) => (
          <Link key={t.to} to={t.to} className="cartao flex min-h-14 items-center gap-3 px-3.5 py-2.5 no-underline" style={{ color: 'inherit' }}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rosa text-forte-rosa">{t.icone}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block font-extrabold">{t.rotulo}</span>
              <span className="text-[13px] text-suave">{t.dica}</span>
            </span>
            <ChevronRight size={20} className="text-suave" />
          </Link>
        ))}
      </section>
    </div>
  )
}
