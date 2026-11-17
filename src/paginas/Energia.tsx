import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useApp } from '../lib/ContextoApp'
import { energiaDeHoje } from '../lib/fila'
import { hhmm, hojeISO } from '../lib/datas'
import type { MarcaEnergia, NivelEnergia } from '../lib/tipos'
import { EscolhaEnergia, dataPorExtenso, textoLimite } from '../componentes/agora/Pecas'

const MARCAS: { id: MarcaEnergia; nome: string }[] = [
  { id: 'dormi_bem', nome: 'Dormi bem' },
  { id: 'agua', nome: 'Bebi água' },
  { id: 'comi', nome: 'Comi' },
  { id: 'cochilei', nome: 'Cochilei' },
]

/** Check-in de energia: define quantas tarefas o app mostra hoje. Pode refazer quantas vezes quiser. */
export default function Energia() {
  const { energias, registrarEnergia, marcarEnergia } = useApp()
  const hoje = hojeISO()
  const atual = energiaDeHoje(energias, hoje)
  const [escolhido, setEscolhido] = useState<NivelEnergia | null>(null)
  // marcas escolhidas antes do primeiro check-in do dia (vão junto quando escolher o nível)
  const [marcasAntes, setMarcasAntes] = useState<MarcaEnergia[]>([])

  const nivel = escolhido ?? atual?.nivel ?? null
  const marcas = atual?.marcas ?? marcasAntes
  const checkinsHoje = energias.filter((e) => e.dia === hoje).length

  async function escolher(n: NivelEnergia) {
    setEscolhido(n)
    await registrarEnergia(n, marcas)
  }

  function alternarMarca(m: MarcaEnergia) {
    const novas = marcas.includes(m) ? marcas.filter((x) => x !== m) : [...marcas, m]
    // com check-in hoje: atualiza o mais recente (sem criar um novo a cada toque)
    if (atual) void marcarEnergia(atual.id, novas)
    else setMarcasAntes(novas)
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div>
        <p className="m-0 text-sm font-semibold text-suave">{dataPorExtenso(hoje)}</p>
        <h1 className="m-0 mt-1 text-[28px] leading-tight">Como tá sua energia agora?</h1>
      </div>

      <EscolhaEnergia atual={nivel} aoEscolher={(n) => void escolher(n)} />

      {nivel && (
        <div className="entrar flex flex-col gap-3">
          <div role="status" className="tom cor-verde rounded-[14px] px-3.5 py-3 text-sm font-semibold">
            {textoLimite(nivel)}
          </div>
          <Link to="/agora" className="btn no-underline">
            Ver minha próxima coisa <ChevronRight size={20} />
          </Link>
        </div>
      )}

      <section>
        <h2 className="m-0 mb-2.5 mt-1 text-[15px]">Anotar pra entender minha energia</h2>
        <div className="flex flex-wrap gap-2">
          {MARCAS.map((m) => (
            <button key={m.id} type="button" className="chip" aria-pressed={marcas.includes(m.id)} onClick={() => alternarMarca(m.id)}>
              {m.nome}
            </button>
          ))}
        </div>
      </section>

      <p className="m-0 text-[13px] text-suave">
        {atual && checkinsHoje > 0
          ? `Último check-in às ${hhmm(atual.created_at)}. A energia muda ao longo do dia: pode refazer quando quiser.`
          : 'A energia muda ao longo do dia. Se mudar, é só voltar aqui e marcar de novo.'}
      </p>
    </div>
  )
}
