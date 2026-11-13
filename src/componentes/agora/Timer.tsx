import { useEffect, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const TOTAL = 10 * 60

/** "Só 10 minutos": um empurrãozinho para começar. Pode parar quando quiser. */
export default function Timer({ aoTerminar }: { aoTerminar: () => void }) {
  const [resta, setResta] = useState(TOTAL)
  const [rodando, setRodando] = useState(true)

  useEffect(() => {
    if (!rodando || resta <= 0) return
    const t = setInterval(() => setResta((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [rodando, resta])

  const acabou = resta === 0
  const mm = String(Math.floor(resta / 60)).padStart(2, '0')
  const ss = String(resta % 60).padStart(2, '0')
  const pct = ((TOTAL - resta) / TOTAL) * 100

  return (
    <div className="entrar flex flex-col gap-2.5 rounded-2xl bg-fundo p-4 text-center" role="timer" aria-live="off">
      <div className="text-[44px] font-extrabold leading-none tabular-nums" aria-label={`${mm} minutos e ${ss} segundos`}>
        {mm}:{ss}
      </div>
      <div className="barra-trilho" aria-hidden="true">
        <div className="barra-valor" style={{ width: `${pct}%` }} />
      </div>
      <p className="m-0 text-sm font-semibold text-suave" aria-live="polite">
        {acabou ? 'Acabaram os 10 minutos. Pode parar aqui, começar já valeu!' : 'Pode parar quando acabar. Começar já valeu.'}
      </p>
      <div className="flex gap-2">
        {!acabou && (
          <button type="button" className="btn btn-suave !min-h-11 flex-1 text-sm" onClick={() => setRodando((r) => !r)}>
            {rodando ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Continuar</>}
          </button>
        )}
        <button type="button" className="btn btn-suave !min-h-11 flex-1 text-sm" onClick={aoTerminar}>
          Fechar o timer
        </button>
      </div>
    </div>
  )
}
