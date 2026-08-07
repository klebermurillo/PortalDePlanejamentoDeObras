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

### Guia de migracao

Veja o mapeamento completo dos flows para o portal em `docs/migracao-powerapps-portal.md`.
