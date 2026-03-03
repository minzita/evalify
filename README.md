# Evalify 🎓

SaaS de provas gamificadas com IA para professores e alunos.

## O que é

Professores criam provas no painel. A IA gera automaticamente um mini-site gamificado com tema visual, cores e mensagens personalizadas. O sistema gera um link único e QR code para os alunos acessarem. O aluno faz a prova, recebe o score em tempo real e o resultado fica salvo para o professor visualizar e imprimir.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Banco de dados | PostgreSQL + Prisma ORM v7 |
| Autenticação | NextAuth.js v4 (JWT) |
| IA | Claude Haiku (Anthropic SDK) |
| Estilo | Tailwind CSS v4 |
| Linguagem | TypeScript |

---

## Estrutura do projeto

```
evalify/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/   # Handler NextAuth
│   │   │   └── register/        # Cadastro de professor
│   │   ├── exams/
│   │   │   ├── route.ts         # GET listar / POST criar prova
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET / PUT / PATCH (fechar) / DELETE prova
│   │   │       ├── questions/route.ts # POST adicionar questão
│   │   │       ├── publish/route.ts   # POST publicar + gerar slug
│   │   │       ├── generate-theme/    # POST gerar tema com IA
│   │   │       └── results/route.ts   # GET resultados da prova
│   │   ├── questions/[id]/      # PUT / DELETE questão
│   │   └── public/
│   │       ├── exam/[slug]/
│   │       │   ├── route.ts     # GET dados da prova (sem gabarito)
│   │       │   └── attempt/     # POST iniciar tentativa
│   │       └── attempt/[id]/
│   │           └── submit/      # POST enviar respostas + calcular score
│   ├── dashboard/               # Painel do professor (autenticado)
│   │   ├── page.tsx             # Lista de provas
│   │   └── exams/
│   │       ├── new/             # Criar nova prova
│   │       └── [id]/
│   │           ├── edit/        # Editor de questões + publicação
│   │           └── results/     # Resultados + impressão
│   ├── exam/[slug]/             # Fluxo público do aluno
│   │   ├── page.tsx             # Tela de entrada gamificada
│   │   ├── take/                # Interface de questões + timer
│   │   └── result/              # Tela de resultado + score
│   ├── login/                   # Página de login
│   └── register/                # Página de cadastro
├── components/
│   ├── ExamEditor.tsx           # Editor completo (questões + tema IA + publicação)
│   ├── DashboardExamList.tsx    # Lista de provas com Finalizar/Excluir (client)
│   ├── ExamEntrance.tsx         # Tela de entrada do aluno (tema gamificado)
│   ├── ExamTaker.tsx            # Interface de responder questões (tema gamificado)
│   ├── ExamStatusBadge.tsx      # Badge de status (DRAFT/PUBLISHED/CLOSED)
│   ├── DeleteExamButton.tsx     # Botão de exclusão legado (não usado no dashboard)
│   ├── SignOutButton.tsx        # Botão de logout
│   └── Providers.tsx            # SessionProvider do NextAuth
├── lib/
│   ├── prisma.ts                # Singleton do PrismaClient (adapter pg)
│   └── auth.ts                  # Configuração do NextAuth
├── prisma/
│   └── schema.prisma            # Modelos do banco de dados
└── types/
    └── next-auth.d.ts           # Extensão de tipos da sessão
```

---

## Banco de dados

### Modelos

- **Teacher** — professores cadastrados (email + senha hash bcrypt)
- **Exam** — provas com slug único, tema IA em JSON, status DRAFT/PUBLISHED/CLOSED
- **Question** — questões com ordem e pontuação configurável
- **Option** — alternativas da questão (isCorrect nunca é exposto ao aluno)
- **Attempt** — tentativa do aluno com score, maxScore e percentual calculados
- **Answer** — resposta individual por questão com isCorrect e pontos ganhos

---

## Configuração local

### Pré-requisitos

- Node.js 18+
- PostgreSQL 13+

### Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Crie o arquivo .env com o conteúdo da seção abaixo

# 3. Criar banco de dados no PostgreSQL
psql -U postgres -c "CREATE DATABASE evalify;"

# 4. Rodar migrações
npx prisma migrate dev

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis de ambiente (.env)

```env
DATABASE_URL="postgresql://postgres:SENHA@localhost:5432/evalify"
NEXTAUTH_SECRET="string-secreta-forte-32-chars"
NEXTAUTH_URL="http://localhost:3001"
ANTHROPIC_API_KEY="sk-ant-..."   # Opcional — usa tema padrão se ausente
```

---

## Fluxo do Professor

1. Cadastro em `/register` → Login em `/login`
2. Dashboard em `/dashboard` — lista todas as provas com badges de status
3. Criar prova em `/dashboard/exams/new` — título, descrição, tempo limite
4. Editor de questões — adicionar, editar inline e excluir questões e alternativas
5. **Gerar tema com IA** — Claude Haiku analisa a prova e retorna tema visual rico (cores, gradiente, padrão de fundo, emoji, ícones, mensagens)
6. **Publicar** — gera slug único (nanoid 10 chars) e exibe link copiável
7. Compartilhar link com os alunos
8. **Finalizar prova** — muda status para CLOSED; alunos não conseguem mais responder
9. Ver resultados em `/dashboard/exams/[id]/results` — tabela com score e aprovação
10. Imprimir relatório em `/dashboard/exams/[id]/results/print`
11. **Excluir prova** — remove permanentemente (qualquer status, com confirmação)

## Fluxo do Aluno

1. Acessa `/exam/[slug]` via link ou QR code
2. Tela gamificada com tema da IA — insere nome e número/turma
3. Responde questões uma por uma com timer (se configurado)
4. Tela de confirmação antes de enviar
5. Score calculado no servidor — gabarito nunca exposto ao cliente
6. Tela de resultado com pontuação, percentual e mensagem personalizada

---

## Lógica de score

```
pontos_questão = isCorrect ? question.points : 0
score_final    = SUM(pontos por questão)
percentual     = (score_final / max_score) * 100
aprovado       = percentual >= 60%
```

O cálculo acontece inteiramente no servidor (`POST /api/public/attempt/[id]/submit`).

---

## Geração de link único

```ts
import { nanoid } from 'nanoid'
const slug = nanoid(10)  // ex: "V1StGXR8_Z"
// ~1 bilhão de combinações, URL-safe
```

URL pública: `http://seudominio.com/exam/{slug}`

---

## IA — Geração de tema

O endpoint `POST /api/exams/[id]/generate-theme` envia para o Claude Haiku:
- Título e descrição da prova
- Primeiras 5 questões como contexto

O modelo retorna JSON com:
```json
{
  "themeName": "nome criativo do tema",
  "color": "#hexcolor primário",
  "colorSecondary": "#hexcolor secundário",
  "emoji": "🚀",
  "icons": ["🌟", "📚", "🎯"],
  "style": "moderno | infantil | futurista | minimalista | natureza | esportivo | classico",
  "bgPattern": "pontos | ondas | geometrico | solido",
  "welcomeMsg": "mensagem de boas-vindas (máx 80 chars)",
  "congratsMsg": "mensagem de parabéns (máx 80 chars)",
  "encourageMsg": "mensagem de encorajamento (máx 80 chars)"
}
```

O tema é aplicado como gradiente no cabeçalho e padrão de fundo nas páginas do aluno (entrada, questões e resultado).

Se a `ANTHROPIC_API_KEY` não estiver configurada, usa valores padrão automaticamente.

---

## Deploy (produção)

Recomendado: **Vercel** (frontend + API) + **Supabase** (PostgreSQL)

1. Criar projeto no Vercel e conectar repositório
2. Criar banco no Supabase → copiar connection string
3. Configurar variáveis de ambiente no Vercel
4. Rodar `npx prisma migrate deploy` no CI/CD
