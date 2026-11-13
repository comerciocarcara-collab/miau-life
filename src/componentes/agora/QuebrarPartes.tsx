import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Folha from '../Folha'
import type { Atividade } from '../../lib/tipos'

/** Sugestões simples de primeiros passos, pelo jeito da tarefa. */
export function sugerirPassos(titulo: string): string[] {
  const t = titulo.toLowerCase()
  if (/estud|aula|matéria|materia|prova|revis|ler |leitura|livro|exerc|trabalho da|faculdade|curso/.test(t))
    return ['Abrir o material', 'Ler 1 página (ou ver 5 min da aula)', 'Anotar 3 pontos']
  if (/louça|louca|prato/.test(t)) return ['Juntar os copos e pratos', 'Encher a pia com água e sabão', 'Lavar só os copos']
  if (/roupa|lavar a roupa|máquina|maquina|varal/.test(t)) return ['Separar as roupas', 'Colocar na máquina', 'Estender ou guardar']
  if (/limp|faxina|arrum|organiz|banheiro|quarto|closet|armário|armario/.test(t))
    return ['Pegar um saco de lixo', 'Tirar o que está fora do lugar', 'Limpar só uma superfície']
  if (/e-?mail|mensagem|responder|ligar|whats/.test(t)) return ['Abrir a conversa', 'Escrever só a primeira frase', 'Enviar']
  if (/mala|viagem/.test(t)) return ['Separar a mala', 'Escolher as roupas', 'Pôr os itens de higiene']
  return ['Separar o que preciso', 'Fazer só os primeiros 5 minutos', 'Ver o que falta']
}

/** Folha para transformar uma tarefa grande em passos de uns 5 minutos. */
export default function QuebrarPartes({
  atividade,
  aoSalvar,
  aoFechar,
}: {
  atividade: Atividade
  aoSalvar: (passos: string[]) => Promise<boolean>
  aoFechar: () => void
}) {
  const sugestoes = sugerirPassos(atividade.titulo)
  const [passos, setPassos] = useState<string[]>(['', '', ''])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const preenchidos = passos.map((p) => p.trim()).filter(Boolean)

  async function salvar() {
    if (preenchidos.length === 0) return
    setSalvando(true)
    setErro(null)
    const ok = await aoSalvar(preenchidos)
    setSalvando(false)
    if (ok) aoFechar()
    else setErro('Não consegui guardar os passos agora. Tente de novo daqui a pouco.')
  }

  return (
    <Folha titulo="Quebrar em partes" aoFechar={aoFechar}>
      <p className="m-0 mb-1 font-extrabold">{atividade.titulo}</p>
      <p className="m-0 mb-4 text-sm text-suave">Passos bem pequenos, de uns 5 minutos. O app mostra um de cada vez.</p>

      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {passos.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rosa text-sm font-extrabold text-forte-rosa">{i + 1}</span>
            <input
              className="campo"
              value={p}
              placeholder={sugestoes[i] ?? 'Mais um passo pequeno'}
              aria-label={`Passo ${i + 1}`}
              onChange={(e) => setPassos((l) => l.map((x, k) => (k === i ? e.target.value : x)))}
            />
            {passos.length > 1 && (
              <button
                type="button"
                aria-label={`Tirar o passo ${i + 1}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-0 bg-transparent text-suave"
                onClick={() => setPassos((l) => l.filter((_, k) => k !== i))}
              >
                <X size={18} />
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-suave !min-h-11 text-sm" onClick={() => setPassos((l) => [...l, ''])}>
          <Plus size={16} /> Mais um passo
        </button>
        <button
          type="button"
          className="btn btn-suave !min-h-11 text-sm"
          onClick={() => setPassos((l) => l.map((x, i) => x.trim() || sugestoes[i] || x))}
        >
          Usar as sugestões
        </button>
      </div>

      {erro && <p className="m-0 mt-3 rounded-2xl bg-pessego px-4 py-3 text-sm">{erro}</p>}

      <button type="button" className="btn mt-5 w-full" disabled={preenchidos.length === 0 || salvando} onClick={() => void salvar()}>
        {salvando ? 'Guardando…' : preenchidos.length > 0 ? `Guardar ${preenchidos.length} ${preenchidos.length === 1 ? 'passo' : 'passos'}` : 'Escreva pelo menos um passo'}
      </button>
    </Folha>
  )
}
