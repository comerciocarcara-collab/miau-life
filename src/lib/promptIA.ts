// Prompt pronto para colar no ChatGPT (ou qualquer outra IA). A resposta volta num
// formato fixo que o app sabe ler (veja lib/importar.ts).
import type { Area } from './tipos'
import { parseISO, somarDias } from './datas'

const DIAS_LONGOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export function montarPrompt(areas: Area[], hoje: string): string {
  const nomes = areas
    .filter((a) => !a.arquivada)
    .sort((a, b) => a.posicao - b.posicao)
    .map((a) => `- ${a.nome}`)
    .join('\n')
  const dow = DIAS_LONGOS[parseISO(hoje).getDay()]
  const amanha = somarDias(hoje, 1)

  return `Você vai me ajudar a organizar tudo o que está acumulado na minha vida, para eu colocar no meu app de organização (Miau Life).

Logo abaixo deste texto eu vou colar tudo o que está na minha cabeça, bagunçado mesmo: tarefas, coisas atrasadas, matérias de estudo acumuladas, compromissos com dia e hora. Sua missão é transformar isso numa lista organizada.

SOBRE MIM
Tenho muitas tarefas acumuladas e minha energia é baixa e varia muito de um dia para o outro. Ver tudo de uma vez me paralisa. Por isso, tarefas grandes precisam virar passos pequenos e concretos, que dá para começar sem pensar.

HOJE
Hoje é ${dow}, ${hoje} (formato AAAA-MM-DD). Use isso para entender "amanhã" (${amanha}), "sexta", "semana que vem" etc. Horários no meu fuso local.

MINHAS ÁREAS (use o nome exatamente como está escrito; se nada combinar, deixe "area" vazio)
${nomes || '- (nenhuma área cadastrada)'}

TIPOS DE ITEM
- "tarefa": algo para fazer, com ou sem prazo. Se tiver data limite, coloque em "prazo".
- "agendada": algo que eu já escolhi fazer num dia específico (use "dia"; "hora" é opcional).
- "compromisso": algo com dia e hora marcados em que preciso estar presente ou online (consulta, aula ao vivo, reunião, show, voo). Use "dia", "hora", "fim" (se souber), "local" e "deslocamento_min" (minutos de estrada somando ida e volta, se eu mencionar).
- "meta": algo que quero fazer algumas vezes por semana, sem dia fixo (academia 3x, estudar 4x). Use "vezes_semana".

PARA CADA ITEM, TAMBÉM
- "minutos": quanto tempo leva, estimado (número).
- "esforco": "leve", "medio" ou "pesado".
- "passos": se a tarefa for grande ou demorar mais de 20 minutos, quebre em passos de 5 a 20 minutos, em ordem, bem concretos (ex.: "Lavar a louça" → "Juntar os copos", "Encher a pia"). Para ESTUDOS isso é obrigatório: divida cada matéria ou conteúdo acumulado em pedacinhos (ex.: "Assistir aula 3 (até 20 min)", "Fazer 5 exercícios", "Revisar resumo da aula 2").
- "obs": um comentário curto, se for útil.

REGRAS IMPORTANTES
1. NÃO invente datas, horários nem locais. Se eu não disse, deixe o campo vazio ("").
2. Datas sempre no formato AAAA-MM-DD. Horários sempre HH:MM (24 horas).
3. Não junte coisas diferentes num item só. Não repita itens.
4. Escreva os títulos curtos, começando com um verbo quando fizer sentido.
5. Se ficou faltando alguma informação essencial, me pergunte em texto ANTES do bloco de código, em poucas linhas. Mesmo assim, entregue o bloco com o que já der para organizar.
6. Responda com UM ÚNICO bloco de código \`\`\`json, exatamente neste formato (sem comentários dentro do JSON):

\`\`\`json
{
  "itens": [
    {
      "titulo": "Estudar Anatomia: sistema digestório",
      "area": "Estudos",
      "tipo": "tarefa",
      "prazo": "${somarDias(hoje, 7)}",
      "dia": "",
      "hora": "",
      "fim": "",
      "local": "",
      "deslocamento_min": null,
      "vezes_semana": null,
      "minutos": 60,
      "esforco": "pesado",
      "passos": [
        { "titulo": "Assistir a primeira metade da aula", "minutos": 20 },
        { "titulo": "Fazer o resumo em tópicos", "minutos": 15 },
        { "titulo": "Responder 5 questões", "minutos": 15 }
      ],
      "obs": ""
    },
    {
      "titulo": "Consulta no dentista",
      "area": "",
      "tipo": "compromisso",
      "prazo": "",
      "dia": "${amanha}",
      "hora": "14:30",
      "fim": "15:30",
      "local": "Clínica Sorriso",
      "deslocamento_min": 40,
      "vezes_semana": null,
      "minutos": 60,
      "esforco": "leve",
      "passos": [],
      "obs": ""
    }
  ]
}
\`\`\`

Pode começar. Aqui está tudo o que está na minha cabeça:

`
}
