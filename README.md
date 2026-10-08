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
│   ├── db/               # Conexão com banco MySQL
│   ├── routes/           # Definição das rotas HTTP
│   └── services/         # Regras de negócio (import, relatórios, gráficos, simulações)
└── tmp/relatorios/       # Relatórios gerados temporariamente
```

## 🚀 Tecnologias

| Camada             | Tecnologias                                   |
| ------------------ | ---------------------------------------------- |
| Runtime / Linguagem | Node.js, TypeScript                            |
| API                | Express, Zod (validação), Multer (upload)      |
| Banco de dados     | MySQL (`mysql2`) |
| Relatórios         | Puppeteer (PDF), ExcelJS (planilhas)           |

## ⚙️ Instalação e uso local

Requisitos: Node.js compatível com o projeto, npm e MySQL 8 ou compatível.

1. Instale as dependências e prepare o arquivo local de ambiente:

```bash
npm ci
cp .env.example .env
```

2. Crie o banco e as tabelas. Configure primeiro um usuário MySQL com permissão no servidor e execute:

```bash
mysql -u root -p < database/schema.sql
```

Edite `.env` com o host, o usuário e a senha do MySQL. Não use as credenciais de exemplo em ambientes compartilhados.

3. Crie o primeiro administrador. O comando pede a senha sem exibi-la e só funciona se ainda não houver usuários:

```bash
npm run admin:create -- "Administrador SIGPO" admin@empresa.com
```

4. Inicie a aplicação:

```bash
npm run dev
```

Acesse `http://localhost:3000/` e entre com a conta criada. A carga de demonstração é opcional e pode ser aplicada com `mysql -u root -p portal_obras < database/seed_demo.sql`.

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

### Autenticação e perfis de acesso

O login valida a senha armazenada com hash scrypt e cria uma sessão aleatória no MySQL. O navegador recebe apenas um cookie `HttpOnly`, `SameSite=Lax` e, em produção, `Secure`; o token é armazenado no banco somente como hash. O servidor recupera usuário e perfil do banco em cada requisição protegida. Os headers `x-user-id` e `x-user-role` não são usados como identidade. Tentativas de login são limitadas a 10 por endereço IP a cada 15 minutos; novas senhas devem ter pelo menos 12 caracteres.

O perfil `adm` pode administrar cadastros e parâmetros; o perfil `usuario` trabalha com os próprios registros e simulações. As rotas da API exigem sessão, com exceção de login, logout e verificação de saúde.

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

O fluxo atual da aplicação utiliza MySQL. `database/schema.sql` cria as tabelas, incluindo sessões; `database/seed_demo.sql` contém dados demonstrativos e não cria usuários.

## 🚀 Publicação

O processo de deploy depende da infraestrutura escolhida. Em produção:

- configure `NODE_ENV=production`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` no gerenciador de segredos do ambiente. `SESSION_TTL_SECONDS` e `TRUST_PROXY_HOPS` também podem ser ajustados;
- use HTTPS no proxy/domínio e mantenha a aplicação e o navegador na mesma origem; o cookie de sessão terá o atributo `Secure`; se houver proxy reverso, configure `TRUST_PROXY_HOPS` para a quantidade de proxies confiáveis;
- crie o banco, aplique o schema e faça o bootstrap do primeiro administrador antes de iniciar o serviço;
- instale as bibliotecas nativas de sistema exigidas pelo Chromium do Puppeteer para gerar relatórios PDF em Linux;
- execute `npm ci`, `npm run build` e `npm start`;
- configure backups do MySQL, monitoramento, política de atualização e procedimento de restauração antes de liberar dados reais.

O endpoint `GET /api/health` verifica a disponibilidade do processo, não a conectividade com o banco. O repositório ainda não define um provedor de hospedagem ou pipeline de deploy.

## 📚 Documentação

- Guia de migração PowerApps → Portal: [docs/migracao-powerapps-portal.md](docs/migracao-powerapps-portal.md)
- Processo do MVP: [docs/processo-mvp-portal.md](docs/processo-mvp-portal.md)
