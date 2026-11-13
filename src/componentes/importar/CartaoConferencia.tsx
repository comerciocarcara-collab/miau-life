// Um item lido da resposta da outra IA, para ela conferir e ajustar antes de guardar.
import { X } from 'lucide-react'
import type { Area, Esforco, TipoAtividade } from '../../lib/tipos'
import type { ItemImportado } from '../../lib/importar'

const TIPOS: { id: TipoAtividade; rotulo: string }[] = [
  { id: 'caixa', rotulo: 'Tarefa (sem data)' },
  { id: 'prazo', rotulo: 'Tarefa com prazo' },
  { id: 'agendada', rotulo: 'Agendada num dia' },
  { id: 'compromisso', rotulo: 'Compromisso' },
  { id: 'flexivel', rotulo: 'Meta da semana' },
]

export default function CartaoConferencia({
  item,
  areas,
  mostrarExtras,
  aoMudar,
}: {
  item: ItemImportado
  areas: Area[]
  /** campos da Etapa 5 (tempo, esforço, deslocamento) */
  mostrarExtras: boolean
  aoMudar: (p: Partial<ItemImportado>) => void
}) {
  const area = areas.find((a) => a.id === item.area_id)
  const comDia = item.tipo === 'agendada' || item.tipo === 'compromisso'

  return (
    <li className={`cartao flex flex-col gap-3 p-4 transition-opacity ${item.incluir ? '' : 'opacity-50'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.incluir}
          onChange={(e) => aoMudar({ incluir: e.target.checked })}
          aria-label={item.incluir ? `Não guardar “${item.titulo}”` : `Guardar “${item.titulo}”`}
          className="mt-3 h-6 w-6 shrink-0 accent-[var(--c-destaque)]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input className="campo !font-bold" value={item.titulo} onChange={(e) => aoMudar({ titulo: e.target.value })} aria-label="Título" />
          {area && <span className={`tom cor-${area.cor} self-start rounded-full px-3 py-0.5 text-xs font-extrabold`}>{area.nome}</span>}
        </div>
      </div>

      {item.incluir && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-suave">
            Área
            <select className="campo !min-h-11 !text-sm" value={item.area_id ?? ''} onChange={(e) => aoMudar({ area_id: e.target.value || null })}>
              <option value="">Sem área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-suave">
            Tipo
            <select className="campo !min-h-11 !text-sm" value={item.tipo} onChange={(e) => aoMudar({ tipo: e.target.value as TipoAtividade })}>
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>{t.rotulo}</option>
              ))}
            </select>
          </label>

          {item.tipo === 'prazo' && (
            <label className="col-span-2 flex flex-col gap-1 text-xs font-bold text-suave">
              Prazo
              <input type="date" className="campo !min-h-11" value={item.prazo ?? ''} onChange={(e) => aoMudar({ prazo: e.target.value || null })} />
            </label>
          )}
          {comDia && (
            <>
              <label className="col-span-2 flex flex-col gap-1 text-xs font-bold text-suave">
                Dia
                <input type="date" className="campo !min-h-11" value={item.dia ?? ''} onChange={(e) => aoMudar({ dia: e.target.value || null })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-suave">
                Começa
                <input type="time" className="campo !min-h-11" value={item.hora ?? ''} onChange={(e) => aoMudar({ hora: e.target.value || null })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-suave">
                Termina
                <input type="time" className="campo !min-h-11" value={item.fim ?? ''} onChange={(e) => aoMudar({ fim: e.target.value || null })} />
              </label>
            </>
          )}
          {item.tipo === 'compromisso' && (
            <>
              <label className="flex flex-col gap-1 text-xs font-bold text-suave">
                Local
                <input className="campo !min-h-11" value={item.local ?? ''} onChange={(e) => aoMudar({ local: e.target.value || null })} />
              </label>
              {mostrarExtras && (
                <label className="flex flex-col gap-1 text-xs font-bold text-suave">
                  Estrada (min)
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="campo !min-h-11"
                    value={item.deslocamento_min ?? ''}
                    onChange={(e) => aoMudar({ deslocamento_min: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                  />
                </label>
              )}
            </>
          )}
          {item.tipo === 'flexivel' && (
            <label className="col-span-2 flex flex-col gap-1 text-xs font-bold text-suave">
              Vezes por semana
              <input
                type="number"
                min={1}
                max={7}
                inputMode="numeric"
                className="campo !min-h-11"
                value={item.meta_semana ?? 3}
                onChange={(e) => aoMudar({ meta_semana: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })}
              />
            </label>
          )}
          {mostrarExtras && item.tipo !== 'compromisso' && (
            <>
              <label className="flex flex-col gap-1 text-xs font-bold text-suave">
                Tempo (min)
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="campo !min-h-11"
                  value={item.minutos ?? ''}
                  onChange={(e) => aoMudar({ minutos: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-suave">
                Esforço
                <select className="campo !min-h-11 !text-sm" value={item.esforco ?? ''} onChange={(e) => aoMudar({ esforco: (e.target.value || null) as Esforco | null })}>
                  <option value="">—</option>
                  <option value="leve">Leve</option>
                  <option value="medio">Médio</option>
                  <option value="pesado">Pesado</option>
                </select>
              </label>
            </>
          )}
        </div>
      )}

      {item.incluir && item.tipo !== 'compromisso' && item.passos.length > 0 && (
        <div>
          <p className="m-0 mb-1 text-xs font-extrabold text-suave">Passos pequenos ({item.passos.length})</p>
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {item.passos.map((p, k) => (
              <li key={k} className="flex items-center gap-2 rounded-xl bg-trilho py-1 pl-3 pr-1 text-sm">
                <span className="font-extrabold text-suave">{k + 1}.</span>
                <span className="min-w-0 flex-1">{p.titulo}</span>
                {p.minutos ? <span className="shrink-0 text-xs text-suave">{p.minutos} min</span> : null}
                <button
                  type="button"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-suave"
                  aria-label={`Tirar o passo “${p.titulo}”`}
                  onClick={() => aoMudar({ passos: item.passos.filter((_, j) => j !== k) })}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {item.incluir && item.obs && <p className="m-0 text-xs text-suave">{item.obs}</p>}
    </li>
  )
}
