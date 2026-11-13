import { BedDouble, Bus, Car, Pencil, Plane } from 'lucide-react'
import type { ViagemTrecho } from '../../lib/tipos'
import { dataCurta, hhmm, iso } from '../../lib/datas'

export type Etiqueta = 'IDA' | 'VOLTA' | 'CONEXÃO' | 'TRECHO'

const AC = 'a confirmar'

export const quando = (ts: string | null) => (ts ? `${dataCurta(iso(new Date(ts)))} · ${hhmm(ts)}` : null)

function Info({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold text-suave">{rotulo}</div>
      <div className={`truncate text-[15px] font-extrabold ${valor ? '' : 'text-suave'}`}>{valor || AC}</div>
    </div>
  )
}

function IconeTipo({ tipo }: { tipo: ViagemTrecho['tipo'] }) {
  if (tipo === 'carro') return <Car size={28} />
  if (tipo === 'onibus') return <Bus size={28} />
  return <Plane size={28} />
}

/** Cartão estilo cartão de embarque (voo, carro ou ônibus). */
export function CartaoEmbarque({ t, etiqueta, aoEditar }: { t: ViagemTrecho; etiqueta: Etiqueta; aoEditar: () => void }) {
  const ehVoo = t.tipo === 'voo'
  const checkinFuturo = t.checkin_em && Date.parse(t.checkin_em) > Date.now() - 86400000
  return (
    <article className="cartao overflow-hidden !rounded-3xl">
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="tom cor-rosa rounded-full px-2.5 py-0.5 text-xs font-extrabold">{etiqueta}</span>
          <span className="flex items-center gap-1">
            <span className={`text-[13px] font-bold ${t.partida ? 'text-suave' : 'text-suave/80'}`}>{t.partida ? dataCurta(iso(new Date(t.partida))) : 'data a confirmar'}</span>
            <button onClick={aoEditar} aria-label="Editar trecho" className="grid h-11 w-11 place-items-center rounded-full border-0 bg-transparent text-suave">
              <Pencil size={18} />
            </button>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[34px] font-extrabold leading-none">{(t.origem || '···').toUpperCase()}</div>
            <div className="truncate text-[13px] text-suave">{t.origem_nome || 'origem'}</div>
          </div>
          <span className="shrink-0 text-destaque">
            <IconeTipo tipo={t.tipo} />
          </span>
          <div className="min-w-0 text-right">
            <div className="text-[34px] font-extrabold leading-none">{(t.destino || '···').toUpperCase()}</div>
            <div className="truncate text-[13px] text-suave">{t.destino_nome || 'destino'}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-0 border-t-2 border-dashed border-borda px-5 py-3.5">
        <Info rotulo={ehVoo ? 'Voo' : 'Viagem'} valor={t.numero} />
        <Info rotulo={ehVoo ? 'Embarque' : 'Saída'} valor={t.partida ? hhmm(t.partida) : null} />
        <Info rotulo={ehVoo ? 'Aeroporto' : 'De onde sai'} valor={t.aeroporto} />
        {ehVoo ? <Info rotulo="Portão" valor={t.portao} /> : <Info rotulo="Chegada" valor={t.chegada ? hhmm(t.chegada) : null} />}
        {t.localizador && <Info rotulo="Localizador" valor={t.localizador} />}
      </div>
      {checkinFuturo && (
        <div className="tom cor-verde px-5 py-2.5 text-[13px] font-bold">Check-in online abre {quando(t.checkin_em)}</div>
      )}
    </article>
  )
}

/** Noite numa cidade no meio do caminho. */
export function CartaoPernoite({ t, proximo, aoEditar }: { t: ViagemTrecho; proximo: ViagemTrecho | null; aoEditar: () => void }) {
  const cidade = t.destino_nome || t.destino || 'no caminho'
  return (
    <article className="tom cor-lilas flex items-start gap-3 rounded-[20px] px-4 py-3.5">
      <BedDouble size={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-base font-extrabold">Noite em {cidade}</div>
        <div className="mt-1 text-[13px] font-semibold leading-relaxed">
          Chego {t.chegada ? `às ${hhmm(t.chegada)}` : `(horário ${AC})`} · durmo em {t.notas || `(local ${AC})`}
          {proximo && (
            <>
              <br />
              Próximo {proximo.tipo === 'voo' ? 'voo' : 'trecho'}
              {proximo.numero ? ` ${proximo.numero}` : ''}
              {proximo.destino_nome ? ` pra ${proximo.destino_nome}` : ''} {proximo.partida ? `às ${hhmm(proximo.partida)}` : `(horário ${AC})`}
            </>
          )}
        </div>
      </div>
      <button onClick={aoEditar} aria-label="Editar pernoite" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-0 bg-transparent text-inherit">
        <Pencil size={18} />
      </button>
    </article>
  )
}
