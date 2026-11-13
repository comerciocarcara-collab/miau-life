import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BatteryMedium, Bell, ChevronRight, Clock, Inbox, Plane, Sparkles } from 'lucide-react'
import { useApp } from '../lib/ContextoApp'
import Folha from '../componentes/Folha'
import Bonequinha from '../componentes/Bonequinha'
import CuidadosHoje from '../componentes/inicio/CuidadosHoje'
import { alertas, conflitosDoDia, itensDoDia } from '../lib/agenda'
import { emAndamento, energiaDeHoje, TEXTO_ENERGIA, viagemEmDestaque } from '../lib/fila'
import { dataCurta, diasEntre, hojeISO, nomeMes, parseISO } from '../lib/datas'

const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function dataDoTopo(dia: string) {
  const d = parseISO(dia)
  return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${nomeMes(d.getMonth()).toLowerCase()}`
}

export default function Inicio() {
  const { nome, atividades, ocorrencias, energias, viagens, erro } = useApp()
  const [verAlertas, setVerAlertas] = useState(false)
  const hoje = hojeISO()

  const doDia = useMemo(() => itensDoDia(hoje, atividades, ocorrencias).filter((i) => i.categoria !== 'rotina'), [hoje, atividades, ocorrencias])
  const conflitosHoje = useMemo(() => conflitosDoDia(doDia), [doDia])
  const al = useMemo(() => alertas(hoje, atividades, ocorrencias), [hoje, atividades, ocorrencias])
  const totalAlertas = al.atrasadas.length + al.conflitos.length + (al.caixa.length > 0 ? 1 : 0)

  const energia = energiaDeHoje(energias, hoje)
  const viagem = viagemEmDestaque(viagens, hoje)
  const compromissos = doDia.filter((i) => i.categoria === 'presenca' && !i.feito && !i.atividade.eh_deslocamento).slice(0, 2)
  const primeiroNome = nome.split(' ')[0]

  return (
    <div className="flex flex-col gap-3">
      <header className="relative pr-14">
        <p className="m-0 text-sm font-semibold text-suave">{dataDoTopo(hoje)}</p>
        <h1 className="m-0 mt-1 text-[28px] leading-tight">Oi, {primeiroNome}</h1>
        <button
          onClick={() => setVerAlertas(true)}
          aria-label={totalAlertas > 0 ? `Alertas (${totalAlertas})` : 'Alertas'}
          className="cartao absolute right-0 top-0 grid h-12 w-12 place-items-center !rounded-full"
        >
          <Bell size={22} />
          {totalAlertas > 0 && <span className="selo absolute -right-1 -top-1">{totalAlertas}</span>}
        </button>
      </header>

      {erro && (
        <div role="alert" className="rounded-2xl bg-pessego px-4 py-3 text-sm text-forte-pessego">
          Não consegui carregar ou salvar agora. Confira a internet. <span className="opacity-70">({erro})</span>
        </div>
      )}

      <div className="flex items-center justify-center rounded-3xl bg-rosa py-2">
        <Bonequinha className="h-[200px] w-[190px]" />
      </div>

      {conflitosHoje.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl bg-pessego px-4 py-3 text-sm text-forte-pessego">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <span>
            <b>Dois compromissos no mesmo horário:</b> {conflitosHoje[0].a.atividade.titulo} ({conflitosHoje[0].a.hora}) e {conflitosHoje[0].b.atividade.titulo} ({conflitosHoje[0].b.hora}).
          </span>
        </div>
      )}

      {energia ? (
        <div className="flex items-center gap-2">
          <Link to="/energia" className="tom cor-rosa inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold no-underline">
            <BatteryMedium size={18} /> Energia {TEXTO_ENERGIA[energia.nivel].nome.toLowerCase()}
          </Link>
          <Link to="/agora" className="btn !min-h-11 flex-1 text-[15px] no-underline">
            <Sparkles size={18} /> Minha próxima coisa
          </Link>
        </div>
      ) : (
        <Link to="/energia" className="cartao flex items-center gap-3 p-3.5 no-underline" style={{ color: 'inherit' }}>
          <span className="tom cor-rosa grid h-11 w-11 shrink-0 place-items-center rounded-[14px]">
            <BatteryMedium size={24} />
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[17px] font-extrabold">Como tá sua energia?</span>
            <span className="text-sm text-suave">Um toque e o app separa só o que cabe hoje</span>
          </span>
          <ChevronRight size={20} className="text-suave" />
        </Link>
      )}

      {viagem && (
        <Link to="/viagem" className="tom cor-lilas flex items-center gap-3 rounded-2xl px-4 py-3 no-underline">
          <Plane size={20} className="shrink-0" />
          <span className="flex-1 text-sm font-bold leading-tight">
            {emAndamento(viagem, hoje) ? (
              <>Modo viagem em {viagem.destino}{viagem.pausar_estudos ? ': estudos pausados até você voltar' : ''}</>
            ) : (
              <>
                Viagem a {viagem.destino} {diasAteTexto(diasEntre(hoje, viagem.ida as string))}
              </>
            )}
          </span>
          <ChevronRight size={18} />
        </Link>
      )}

      <CuidadosHoje hoje={hoje} nivel={energia?.nivel ?? null} />

      <Link to="/agenda" className="cartao mt-1 flex items-center gap-3 px-4 py-3 no-underline" style={{ color: 'inherit' }}>
        <Clock size={20} className="shrink-0 text-suave" />
        <span className="min-w-0 flex-1 text-sm leading-snug">
          {compromissos.length === 0 ? (
            <span className="text-suave">Nenhum compromisso marcado para hoje</span>
          ) : (
            compromissos.map((c) => (
              <span key={c.chave} className="block truncate">
                <b>{c.hora ?? 'Hoje'}</b> {c.atividade.titulo}
              </span>
            ))
          )}
        </span>
        <span className="text-sm font-bold text-suave">Agenda</span>
      </Link>

      {verAlertas && (
        <Folha titulo="Alertas" aoFechar={() => setVerAlertas(false)}>
          {totalAlertas === 0 ? (
            <p className="m-0 py-4 text-center text-suave">Nenhum alerta. Está tudo em dia, miau 🐾</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {al.conflitos.map((c, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl bg-pessego p-3 text-sm text-forte-pessego">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                  <span>
                    <b>Conflito em {dataCurta(c.dia)}:</b> {c.a.atividade.titulo} ({c.a.hora}) e {c.b.atividade.titulo} ({c.b.hora}).
                  </span>
                </li>
              ))}
              {al.atrasadas.map((a) => (
                <li key={a.id} className="flex items-start gap-3 rounded-2xl bg-pessego/60 p-3 text-sm">
                  <Clock size={20} className="mt-0.5 shrink-0" />
                  <span>
                    <b>Passou do prazo:</b> {a.titulo} ({dataCurta((a.prazo ?? a.dia) as string)})
                  </span>
                </li>
              ))}
              {al.caixa.length > 0 && (
                <li className="flex items-start gap-3 rounded-2xl bg-lilas p-3 text-sm text-forte-lilas">
                  <Inbox size={20} className="mt-0.5 shrink-0" />
                  <span>
                    <b>{al.caixa.length}</b> {al.caixa.length === 1 ? 'anotação guardada' : 'anotações guardadas'} na Caixa de entrada.{' '}
                    <Link to="/tarefas?aba=caixa" onClick={() => setVerAlertas(false)} className="font-bold">
                      Organizar
                    </Link>
                  </span>
                </li>
              )}
            </ul>
          )}
        </Folha>
      )}
    </div>
  )
}

function diasAteTexto(d: number) {
  if (d <= 0) return 'hoje'
  if (d === 1) return 'amanhã'
  return `em ${d} dias`
}
