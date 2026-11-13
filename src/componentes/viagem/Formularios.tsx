import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Folha from '../Folha'
import type { Viagem, ViagemTrecho } from '../../lib/tipos'
import { hhmm, iso } from '../../lib/datas'

export type DadosViagem = Pick<Viagem, 'destino' | 'ida' | 'volta' | 'hospedagem' | 'notas' | 'pausar_estudos'>
export type DadosTrecho = Omit<ViagemTrecho, 'id' | 'created_at' | 'viagem_id'>

/** ISO salvo → valor do campo datetime-local (hora local). */
const paraCampo = (ts: string | null) => (ts ? `${iso(new Date(ts))}T${hhmm(ts)}` : '')
/** Campo datetime-local → ISO (ou null). */
const doCampo = (v: string) => (v ? new Date(v).toISOString() : null)
const vazio = (v: string) => (v.trim() ? v.trim() : null)

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-bold">
      {rotulo}
      {children}
    </label>
  )
}

export function FormViagem({ inicial, aoSalvar, aoApagar, aoFechar }: { inicial?: Viagem; aoSalvar: (d: DadosViagem) => void; aoApagar?: () => void; aoFechar: () => void }) {
  const [destino, setDestino] = useState(inicial?.destino ?? '')
  const [ida, setIda] = useState(inicial?.ida ?? '')
  const [volta, setVolta] = useState(inicial?.volta ?? '')
  const [hospedagem, setHospedagem] = useState(inicial?.hospedagem ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [pausar, setPausar] = useState(inicial?.pausar_estudos ?? true)

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!destino.trim()) return
    aoSalvar({ destino: destino.trim(), ida: ida || null, volta: volta || null, hospedagem: vazio(hospedagem), notas: vazio(notas), pausar_estudos: pausar })
  }

  return (
    <Folha titulo={inicial ? 'Editar viagem' : 'Nova viagem'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <Campo rotulo="Pra onde?">
          <input className="campo" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Fortaleza" autoFocus required />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Ida">
            <input className="campo" type="date" value={ida} onChange={(e) => setIda(e.target.value)} />
          </Campo>
          <Campo rotulo="Volta">
            <input className="campo" type="date" value={volta} onChange={(e) => setVolta(e.target.value)} />
          </Campo>
        </div>
        <Campo rotulo="Onde vou ficar">
          <input className="campo" value={hospedagem} onChange={(e) => setHospedagem(e.target.value)} placeholder="Hotel, casa de alguém..." />
        </Campo>
        <Campo rotulo="Anotações">
          <textarea className="campo !min-h-20 py-3" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 accent-[var(--c-destaque)]" checked={pausar} onChange={(e) => setPausar(e.target.checked)} />
          Pausar estudos enquanto eu estiver viajando
        </label>
        <button className="btn mt-1">Salvar viagem</button>
        {aoApagar && (
          <button type="button" onClick={aoApagar} className="btn btn-suave">
            <Trash2 size={18} /> Apagar viagem
          </button>
        )}
      </form>
    </Folha>
  )
}

const TIPOS: { id: ViagemTrecho['tipo']; nome: string }[] = [
  { id: 'voo', nome: 'Voo' },
  { id: 'carro', nome: 'Carro' },
  { id: 'onibus', nome: 'Ônibus' },
  { id: 'pernoite', nome: 'Pernoite' },
]

export function FormTrecho({ inicial, aoSalvar, aoApagar, aoFechar }: { inicial?: ViagemTrecho; aoSalvar: (d: DadosTrecho) => void; aoApagar?: () => void; aoFechar: () => void }) {
  const [tipo, setTipo] = useState<ViagemTrecho['tipo']>(inicial?.tipo ?? 'voo')
  const [origem, setOrigem] = useState(inicial?.origem ?? '')
  const [origemNome, setOrigemNome] = useState(inicial?.origem_nome ?? '')
  const [destino, setDestino] = useState(inicial?.destino ?? '')
  const [destinoNome, setDestinoNome] = useState(inicial?.destino_nome ?? '')
  const [numero, setNumero] = useState(inicial?.numero ?? '')
  const [partida, setPartida] = useState(paraCampo(inicial?.partida ?? null))
  const [chegada, setChegada] = useState(paraCampo(inicial?.chegada ?? null))
  const [aeroporto, setAeroporto] = useState(inicial?.aeroporto ?? '')
  const [portao, setPortao] = useState(inicial?.portao ?? '')
  const [localizador, setLocalizador] = useState(inicial?.localizador ?? '')
  const [checkin, setCheckin] = useState(paraCampo(inicial?.checkin_em ?? null))
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const pernoite = tipo === 'pernoite'
  const voo = tipo === 'voo'

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    aoSalvar({
      tipo,
      origem: pernoite ? null : vazio(origem.toUpperCase()),
      origem_nome: pernoite ? null : vazio(origemNome),
      destino: vazio(destino.toUpperCase()),
      destino_nome: vazio(destinoNome),
      numero: pernoite ? null : vazio(numero),
      partida: pernoite ? null : doCampo(partida),
      chegada: doCampo(chegada),
      aeroporto: pernoite ? null : vazio(aeroporto),
      portao: voo ? vazio(portao) : null,
      localizador: pernoite ? null : vazio(localizador),
      checkin_em: voo ? doCampo(checkin) : null,
      notas: vazio(notas),
    })
  }

  return (
    <Folha titulo={inicial ? 'Editar trecho' : 'Novo trecho'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo">
          {TIPOS.map((t) => (
            <button type="button" key={t.id} className="chip" aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
        {pernoite ? (
          <>
            <Campo rotulo="Cidade">
              <input className="campo" value={destinoNome} onChange={(e) => setDestinoNome(e.target.value)} placeholder="Rio de Janeiro" />
            </Campo>
            <Campo rotulo="Chego às">
              <input className="campo" type="datetime-local" value={chegada} onChange={(e) => setChegada(e.target.value)} />
            </Campo>
            <Campo rotulo="Onde vou dormir">
              <input className="campo" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Hotel perto do aeroporto" />
            </Campo>
          </>
        ) : (
          <>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <Campo rotulo="De">
                <input className="campo uppercase" value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="BEL" maxLength={4} />
              </Campo>
              <Campo rotulo="Cidade">
                <input className="campo" value={origemNome} onChange={(e) => setOrigemNome(e.target.value)} placeholder="Belém" />
              </Campo>
              <Campo rotulo="Para">
                <input className="campo uppercase" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="FOR" maxLength={4} />
              </Campo>
              <Campo rotulo="Cidade">
                <input className="campo" value={destinoNome} onChange={(e) => setDestinoNome(e.target.value)} placeholder="Fortaleza" />
              </Campo>
            </div>
            <Campo rotulo={voo ? 'Número do voo' : 'Empresa ou observação'}>
              <input className="campo" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={voo ? 'G3 2055' : ''} />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo={voo ? 'Embarque' : 'Saída'}>
                <input className="campo !px-2 text-sm" type="datetime-local" value={partida} onChange={(e) => setPartida(e.target.value)} />
              </Campo>
              <Campo rotulo="Chegada">
                <input className="campo !px-2 text-sm" type="datetime-local" value={chegada} onChange={(e) => setChegada(e.target.value)} />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo={voo ? 'Aeroporto' : 'De onde sai'}>
                <input className="campo" value={aeroporto} onChange={(e) => setAeroporto(e.target.value)} />
              </Campo>
              {voo ? (
                <Campo rotulo="Portão">
                  <input className="campo" value={portao} onChange={(e) => setPortao(e.target.value)} />
                </Campo>
              ) : (
                <span />
              )}
            </div>
            <Campo rotulo="Localizador">
              <input className="campo uppercase" value={localizador} onChange={(e) => setLocalizador(e.target.value)} />
            </Campo>
            {voo && (
              <Campo rotulo="Check-in online abre em">
                <input className="campo" type="datetime-local" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
              </Campo>
            )}
          </>
        )}
        <button className="btn mt-1">Salvar trecho</button>
        {aoApagar && (
          <button type="button" onClick={aoApagar} className="btn btn-suave">
            <Trash2 size={18} /> Apagar trecho
          </button>
        )}
      </form>
    </Folha>
  )
}
