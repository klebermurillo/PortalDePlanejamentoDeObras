# Portal De Planejamento De Obras
Plataforma integrada para precificação de atividades, planejamento de obras e simulação de cenários. Permite análise de custos, cronogramas, multas, outorgas e impactos operacionais, apoiando a tomada de decisão em projetos de infraestrutura.

## Backend sem PowerApps

Este repositorio agora contem uma API Node.js/TypeScript para executar no portal as rotinas antes feitas por PowerApps/Power Automate.

### Endpoints

- `GET /api/health`
- `POST /api/importar-dados`
- `POST /api/graficos/:tipo`
- `POST /api/relatorios/gerar`
- `GET /api/relatorios/:id`
- `POST /api/atualizar-historico`
- `POST /api/simulador/upload`

### Executar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variaveis:

```bash
cp .env.example .env
```

3. Subir ambiente dev:

```bash
npm run dev
```

### Acessar o site

Com o servidor rodando, abra:

- Home do portal: `http://localhost:3000/`
- Simulador de cenarios: `http://localhost:3000/simulador.html`
- Tarifador: `http://localhost:3000/tarifador.html`

### Simulador de cenarios

- Dashboard executivo com comparativo entre cenario atual e novo cenario
- Curva S em SVG gerada localmente no navegador
- Indicadores de aderencia atual e simulada
- Painel de parametros para simular custo, prazo, risco, outorga e multa
- Resumo consolidado do cenario com leitura executiva
- Area operacional abaixo com cadastro manual, importacao Excel e tabela de registros

### Persistencia local

- Banco SQLite local: `data/portal.db`
- Fluxo sem dependências de SharePoint nesta fase inicial

### Perfilamento (base para proxima fase)

- O prototipo ja considera dois perfis por contexto de requisicao:
	- `adm`: visualiza e gerencia simulacoes de todos os usuarios
	- `usuario`: visualiza e gerencia apenas as proprias simulacoes
- No prototipo web atual, esse contexto e enviado por headers:
	- `x-user-id`
	- `x-user-role` (`adm` ou `usuario`)
- Em producao, esses valores serao substituidos pela autenticacao real do portal.

### Guia de migracao

Veja o mapeamento completo dos flows para o portal em `docs/migracao-powerapps-portal.md`.
