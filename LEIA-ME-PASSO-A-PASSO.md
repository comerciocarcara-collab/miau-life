# 🐾 Miau Life — Etapa 5: o que fazer agora

O app mudou de casa e ganhou o jeito "uma coisa por vez". Endereço novo:
**https://vetclinvila-dotcom.github.io/miaulife/** (o banco no Supabase é o mesmo, então os dados e o login continuam).

1. **Rodar o `etapa5.sql`** — Supabase → projeto **MiauLife** → **SQL Editor** → **+** → *Create a new snippet* → cole todo o arquivo `supabase/etapa5.sql` → **Run**. Pode rodar mais de uma vez. (Se o `etapa4.sql` ainda não tinha rodado, rode ele antes.)
2. **Conferir o GitHub** do repositório `miaulife`: **Settings → Pages → Source = GitHub Actions** e os dois segredos `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Settings → Secrets and variables → Actions**.
3. **No iPhone:** abra o endereço novo no Safari → Compartilhar → **Adicionar à Tela de Início** (pode apagar o ícone antigo).

### O que tem de novo

- **Energia:** toque em Baixa, Média ou Boa. Baixa mostra 1 tarefa leve; Média até 2; Boa até 3. Dá para refazer à tarde.
- **Agora:** uma tarefa por vez, com **Feito**, **Depois**, **Quebrar em partes** e **Só 10 minutos**. Cada coisa feita vira petisco pro gatinho. Quando cumpre o combinado do dia, o app comemora e não cobra mais nada.
- **Organizar com IA:** copie o prompt pronto, cole no ChatGPT (ou outra IA) junto com tudo que está acumulado, cole a resposta de volta no app, confira e guarde. Também dá para despejar na mão (uma linha = uma tarefa).
- **Agenda do dia:** linha do tempo com compromissos, tempo dirigindo (já descontado) e **janelas livres** que mostram o que cabe nelas.
- **Início com a bonequinha** e os cuidados do dia (cabelo, unha, academia...) com um toque.
- **Viagem:** cartão de embarque dos voos, pernoite, checklist e desejos. Durante a viagem, Estudos ficam pausados.
- **Áreas:** a grade das áreas agora fica na aba **Áreas**.
- **Supabase acordado:** um robozinho no GitHub consulta o banco a cada 3 dias, para o plano grátis não pausar o projeto.

---

# 🐾 Miau Life — Etapa 1 (Fundação): passo a passo

Você **não precisa instalar nada** no computador. São 4 partes: **Supabase** (guarda seus dados), **GitHub** (guarda o app e publica o site), **abrir no iPhone/PC** e **criar sua conta**. Vá com calma, uma parte de cada vez. Se algo for diferente do que está escrito aqui, me mande um print.

---

## Parte 1 — Supabase (o "armário" dos seus dados)

1. Entre em **supabase.com** e clique em **Start your project**. Crie a conta (pode entrar com o GitHub ou com o e-mail).
2. Clique em **New project** e preencha:
   - **Name:** `miau-life`
   - **Database password:** crie uma senha e **guarde num lugar seguro** (clique em *Generate* se quiser).
   - **Region:** escolha **South America (São Paulo)**.
   - Clique em **Create new project** e espere uns 2 minutos.
3. No menu da esquerda, clique em **SQL Editor** → **New query**.
4. Abra o arquivo **`supabase/schema.sql`** (desta pasta, com o Bloco de Notas), copie **tudo**, cole no Supabase e clique em **Run**. Deve aparecer *Success*.
5. Ainda no Supabase, clique em **Authentication** → **Sign In / Providers** (ou *Providers*) → **Email**. Desligue a opção **Confirm email** e clique em **Save**. (Assim você entra direto, sem precisar confirmar por e-mail.)
6. Agora pegue **2 informações** (vá em **Project Settings** → **API**; em versões novas pode estar em **Connect** ou **API Keys**):
   - **Project URL** — parece com `https://abcdefgh.supabase.co`
   - **Chave pública** — chamada **anon public** *ou* **Publishable key**.
   - ⚠️ **Nunca** use a chave **service_role** / **secret**. Essa é secreta e não pode ir para o app.
   - Cole as duas num bloco de notas por enquanto.

## Parte 2 — GitHub (guarda e publica o app)

1. Entre em **github.com** → botão **+** (canto de cima) → **New repository**.
   - **Repository name:** `miau-life`
   - Marque **Public** (é o que o plano gratuito do Pages exige; seus dados continuam protegidos pelo login).
   - Marque **Add a README file**. Clique em **Create repository**.
2. Dentro do repositório: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Crie **dois** segredos:
   - Nome: `VITE_SUPABASE_URL` → valor: o **Project URL** da Parte 1.
   - Nome: `VITE_SUPABASE_ANON_KEY` → valor: a **chave pública** da Parte 1.
3. **Descompacte** o arquivo `miau-life-etapa1.zip` no seu computador (botão direito → *Extrair tudo*).
4. No repositório do GitHub: **Add file** → **Upload files**. Abra a pasta descompactada e **selecione tudo o que tem dentro** (inclusive a pasta `.github`) e **arraste** para a página. Espere carregar e clique em **Commit changes**.
5. **Settings** → **Pages** → em **Source**, escolha **GitHub Actions**.
6. Clique na aba **Actions**. Abra **Publicar Miau Life** → **Run workflow** → **Run workflow**. Espere ficar com a bolinha ✅ verde (uns 2 a 3 minutos).
7. Volte em **Settings** → **Pages**: no topo aparece o endereço do seu site, parecido com
   `https://SEU-USUARIO.github.io/miau-life/`

## Parte 3 — Abrir no iPhone e no computador

**iPhone (use o Safari):**
1. Abra o endereço do seu site no **Safari**.
2. Toque no botão **Compartilhar** (quadradinho com seta para cima).
3. Role e toque em **Adicionar à Tela de Início** → **Adicionar**.
4. Abra pelo ícone do gatinho 🐱. Ele abre em tela cheia, como um aplicativo.

**Computador (Chrome ou Edge):** abra o endereço e clique no ícone de **instalar** (um monitor com seta) no canto direito da barra de endereço → **Instalar**.

## Parte 4 — Criar sua conta

1. No app, toque em **Primeira vez aqui? Criar conta**, coloque seu nome, e-mail e uma senha (mínimo 6 caracteres) e entre.
2. **Depois de criar sua conta**, vá no Supabase → **Authentication** → **Sign In / Providers** e **desligue "Allow new users to sign up"**. Assim ninguém mais consegue criar conta no seu app.
3. Teste: toque na patinha 🐾 (botão rosa), escreva uma anotação e guarde. Ela aparece no Início como "1 anotação na Caixa de entrada". Abra no computador com o mesmo login: a anotação estará lá também. ✨

---

## Se algo der errado

| O que aparece | O que fazer |
| --- | --- |
| Aviso **"Modo demonstração"** no app | Os dois segredos do GitHub (Parte 2, passo 2) estão faltando ou com erro. Corrija e rode de novo em **Actions → Run workflow**. |
| Página em branco / "404" | Confira se em **Settings → Pages** o Source é **GitHub Actions** e se o último item em **Actions** está ✅. |
| ❌ vermelho em **Actions** | Me mande um print da tela (clique no item com ❌). |
| "E-mail ou senha não conferem" | Confira os dados; para trocar a senha, use o Supabase em **Authentication → Users**. |
| "Não consegui carregar seus dados" | O `schema.sql` (Parte 1, passo 4) talvez não rodou. Rode de novo. |

## O que já funciona nesta etapa

- Login seguro e dados na nuvem (celular e PC mostram o mesmo).
- Tela **Início** com saudação, Hoje, alertas, metas (em breve) e cartões das áreas.
- **Anotar rápido** (Caixa de entrada) pela patinha 🐾.
- **Áreas** personalizáveis: renomear, trocar cor e ícone, reordenar, criar novas e arquivar (nada é apagado).
- Tema claro, noite ou automático em **Ajustes**.
- Instalável como app (PWA) no iPhone e no PC.

## O que vem depois

**Etapa 2 (pronta):** atividades dos 4 tipos, calendário geral, metas da semana e alerta de conflito.

**Etapa 3 (pronta):** telas de *Casa & Organização* (cuidados por cômodo + lista de compras) e *Pessoal* (skincare, cabelo, unhas, corpo). Rode `supabase/etapa3.sql` no Supabase antes de subir os arquivos.

**Etapa 4 (pronta):** *Vida Fit* com água do dia, medidas e gráfico de peso, treinos por dia da semana e receitas. Rode `supabase/etapa4.sql` antes de subir os arquivos.

**Etapa 5 (pronta):** energia, "Só 1 coisa agora", organizar com IA, agenda do dia, Início com a bonequinha e Viagem (veja o topo deste arquivo).

**Próximas:** Notificações · depois Estudos + Trabalho · Miau IA · Pets · Financeiro · Fazenda · Viagens + Projetos · Integrações (Google Agenda, cópia em planilha, offline).

---
*Para o futuro: este projeto usa React + TypeScript + Vite + Tailwind + Supabase. Você não precisa mexer nisso.*
