# 🏗️ SIGPO — Sistema Integrado de Gestão e Planejamento de Obras

Plataforma web de apoio à tomada de decisão em projetos de infraestrutura, integrando planejamento, análise de custos, cronogramas, indicadores de desempenho (EVM/Curva S) e simulação de cenários. Este backend em Node.js/TypeScript substitui as rotinas antes executadas por PowerApps/Power Automate.

> O módulo de tarifas (precificação, outorga e multas) é mantido apenas como modelo/protótipo para uma fase futura; o foco atual do sistema é o planejamento de obras.

## 🎯 Objetivos

1. Centralizar em uma única plataforma as informações de planejamento, custos e cronogramas hoje fragmentadas entre planilhas e ferramentas descentralizadas.
2. Aplicar conceitos de gerenciamento de valor agregado (EVM) para análise de desempenho de prazo e custo.
3. Permitir a simulação de cenários (reprogramação de obras, custos e prazos) sem alterar a base oficial de projetos, apoiando a priorização de investimentos.
4. Implementar controle de acesso por perfil de usuário para preservar a integridade das análises.

## 📁 Estrutura do Projeto

```
PortalDePlanejamentoDeObras/
├── database/            # Schema SQL, massa de demonstração e MER (README.md)
│   ├── README.md
│   ├── schema.sql
│   └── seed_demo.sql
├── docs/                 # Documentação funcional e de migração
│   ├── migracao-powerapps-portal.md
│   └── processo-mvp-portal.md
├── public/               # Frontend estático (portal e simulador de planejamento)
│   ├── index.html
│   ├── simulador.html / simulador.js / simulador.css
│   ├── tarifador.html   # protótipo do módulo futuro de tarifas
│   └── theme.js
├── src/                  # Código-fonte da API
│   ├── server.ts         # Bootstrap do servidor Express
│   ├── config.ts         # Variáveis de ambiente e configuração
│   ├── types.ts          # Tipos compartilhados
│   ├── db/               # Conexões com banco (SQLite / MySQL)
│   ├── routes/           # Definição das rotas HTTP
│   └── services/         # Regras de negócio (import, relatórios, gráficos, simulações)
├── data/                 # Banco SQLite local (gerado em runtime)
└── tmp/relatorios/       # Relatórios gerados temporariamente
```

## 🚀 Tecnologias

| Camada             | Tecnologias                                   |
| ------------------ | ---------------------------------------------- |
| Runtime / Linguagem | Node.js, TypeScript                            |
| API                | Express, Zod (validação), Multer (upload)      |
| Banco de dados     | SQLite (local/dev) e MySQL (`mysql2`, produção) |
| Relatórios         | Puppeteer (PDF), ExcelJS (planilhas)           |

## ⚙️ Como Usar

1. Instalar dependências:

```bash
npm install
```

2. Configurar variáveis de ambiente:

```bash
cp .env.example .env
```

3. Subir o ambiente de desenvolvimento:

```bash
npm run dev
```

4. Acessar o site com o servidor rodando:

- Home do portal: `http://localhost:3000/`
- Simulador de cenários (planejamento de obras): `http://localhost:3000/simulador.html`
- Tarifador (protótipo de modelo futuro): `http://localhost:3000/tarifador.html`

## 🔌 Endpoints da API

| Método | Rota                        | Descrição                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/api/health`                | Verifica se a API está no ar                |
| POST   | `/api/importar-dados`        | Importa dados de arquivo Excel               |
| POST   | `/api/graficos/:tipo`        | Gera gráfico (base64) para um dado tipo      |
| POST   | `/api/relatorios/gerar`      | Gera relatório em PDF                        |
| GET    | `/api/relatorios/:id`        | Consulta/baixa relatório gerado              |
| POST   | `/api/atualizar-historico`   | Registra histórico de ações do usuário       |
| POST   | `/api/simulador/upload`      | Importa registros para o simulador via Excel |

### Perfis de acesso

O prototipo considera dois perfis por contexto de requisição, enviados via headers:

- `x-user-id`: identificador do usuário
- `x-user-role`: `adm` (visualiza e gerencia simulações de todos os usuários) ou `usuario` (apenas as próprias simulações)

Em produção, esses valores serão substituídos pela autenticação real do portal.

## 🗄️ Banco de Dados

O schema, o modelo de entidade-relacionamento (MER) e a descrição de cada tabela estão documentados em [database/README.md](database/README.md).

## 🖥️ Módulo de Planejamento e Simulação de Cenários

- Dashboard executivo com comparativo entre cenário atual e novo cenário
- Curva S (planejada x realizada) gerada localmente no navegador
- Indicadores de aderência (EVM: SPI, CPI, SV, CV) atual e simulada
- Painel de parâmetros para simular custo, prazo e reprogramação de obras
- Resumo consolidado do cenário com leitura executiva
- Área operacional com cadastro manual, importação Excel e tabela de registros

### Módulo futuro: Tarifador

O tarifador (`public/tarifador.html` e tabela `tarifador_registros`) é um protótipo de modelo para uma fase futura de precificação, ainda sem rotas de API implementadas.

## 💾 Persistência

- Banco SQLite local: `data/portal.db` (fase inicial, sem dependência de SharePoint)
- Suporte a MySQL para produção (`src/db/mysql.ts`)

## 📚 Documentação

- Guia de migração PowerApps → Portal: [docs/migracao-powerapps-portal.md](docs/migracao-powerapps-portal.md)
- Processo do MVP: [docs/processo-mvp-portal.md](docs/processo-mvp-portal.md)
