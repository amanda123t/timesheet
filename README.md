# TimeSheet — Portal de Gestão de Atividades e Horas

Sistema web corporativo para gestão de atividades, horas e projetos.

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 14 (App Router)               │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  Frontend         │    │  API Routes (Backend)    │   │
│  │  React + TailwindCSS   │  /api/*                  │   │
│  │  TanStack Query   │    │  Prisma ORM              │   │
│  └──────────────────┘    └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL       │
                    │   (via Prisma)    │
                    └───────────────────┘
```

## Modelo de Dados

```
profiles          → Papéis da equipe (Analista, Dev RPA, etc.)
employees         → Funcionários com FK para profile
activities        → Atividades/processos/projetos
activity_estimates→ Horas planejadas por (activity, profile, phase)
tasks             → Tarefas brutas importadas
task_mappings     → DE/PARA: task → activity
months            → Controle de meses (aberto/fechado)
time_entries      → Horas apontadas (coração do sistema)
audit_logs        → Log de auditoria
```

## Telas do Sistema

| # | Tela | Rota |
|---|------|------|
| 1 | Upload e Auditoria | `/upload` |
| ↕ | Mapeamento DE/PARA | `/task-mappings` |
| 2 | Gestão de Perfis | `/profiles` |
| 3 | Colaboradores | `/employees` |
| 4 | Atividades | `/activities` |
| 5 | Auditoria de Dias Sem Apontamento | `/audit` |
| 6 | Resumo por Profissional e Atividade | `/summary` |
| 7 | Planejamento vs Realizado | `/planned-vs-actual` |
| 8 | Conciliação de Funcionários | `/reconciliation` |
| 9 | Gestão de Meses | `/months` |

## Setup

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+

### Instalação

```bash
# 1. Clonar o repositório
git clone <repo>
cd timesheet

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais do PostgreSQL

# 4. Criar o banco de dados e tabelas
npx prisma db push

# 5. Rodar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000

### Produção

```bash
npm run build
npm start
```

## Formatos de Importação

### func.csv — Funcionários
```csv
nome,cargo,perfil
João Silva,Analista Sênior,Analista de Processos
Maria Souza,Dev RPA,Desenvolvedor RPA
```

### base.csv — Base de Horas
```csv
projeto,tarefa,funcionario,data,horas
23616,Release_Desenvolvimento,João Silva,01/01/2026,8
23616,Release_Desenvolvimento,João Silva,02/01/2026,6
```

### depara.csv — Mapeamento DE/PARA
```csv
de,para
Release_Desenvolvimento,Release Support R105 CR1
Arquitetura_Solução,Arquitetura do Sistema v2
```

## API Endpoints

### Perfis
- `GET /api/profiles` — Listar perfis
- `POST /api/profiles` — Criar perfil
- `PUT /api/profiles/:id` — Atualizar
- `DELETE /api/profiles/:id` — Excluir

### Funcionários
- `GET /api/employees` — Listar (filtros: search, profileId)
- `POST /api/employees` — Criar
- `PUT /api/employees/:id` — Atualizar
- `DELETE /api/employees/:id` — Excluir
- `POST /api/employees/import` — Importar CSV

### Atividades
- `GET /api/activities` — Listar (filtros: search, withEstimates)
- `POST /api/activities` — Criar com estimativas
- `PUT /api/activities/:id` — Atualizar
- `DELETE /api/activities/:id` — Desativar (soft delete)
- `GET /api/activities/:id/estimates` — Estimativas da atividade
- `PUT /api/activities/:id/estimates` — Atualizar estimativas

### Tarefas e Mapeamentos
- `GET /api/tasks` — Listar tarefas (filtro: unmappedOnly)
- `GET /api/task-mappings` — Listar mapeamentos
- `PUT /api/task-mappings` — Criar/atualizar mapeamento
- `POST /api/task-mappings/import` — Importar DE/PARA CSV

### Horas
- `POST /api/time-entries/import` — Importar CSV ou XLSX

### Meses
- `GET /api/months` — Listar meses
- `POST /api/months` — Criar mês
- `PUT /api/months/:id` — Fechar/reabrir mês

### Relatórios
- `GET /api/reports/planned-vs-actual` — Planejamento vs Realizado
- `GET /api/reports/summary` — Resumo por profissional e atividade
- `GET /api/reports/missing-entries` — Auditoria de dias sem apontamento
- `GET /api/reports/reconciliation` — Conciliação de funcionários

### Sistema
- `GET /api/system/backup` — Exportar backup JSON
- `POST /api/system/restore` — Restaurar backup
- `POST /api/system/reset` — Resetar sistema
- `GET /api/audit-logs` — Log de auditoria

## Estratégia de Performance

- **Índices no banco**: em employee_id, activity_id, month_id, entry_date, raw_employee_name
- **Desnormalização seletiva**: activity_id na time_entries (resolvido no import)
- **Agrupamento no banco**: relatórios usam GROUP BY no PostgreSQL, não no JS
- **Pré-carregamento no import**: employees e tasks são carregados em Map para lookup O(1)
- **Batch insert**: restauração de backup em lotes de 500 registros

## Tecnologias

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 14.2 | Framework full-stack |
| TypeScript | 5.3 | Tipagem estática |
| Prisma | 5.10 | ORM e migrações |
| PostgreSQL | 14+ | Banco de dados |
| Tailwind CSS | 3.4 | Estilização |
| TanStack Query | 5 | Cache e sincronização de estado |
| papaparse | 5.4 | Parse de CSV |
| xlsx | 0.18 | Leitura de Excel |
| zod | 3.22 | Validação de schemas |
