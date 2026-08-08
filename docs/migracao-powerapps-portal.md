# Migracao PowerApps/Power Automate para Portal

Este documento traduz os flows atuais para endpoints e servicos no portal.

## Objetivo

Remover dependencia de PowerApps e Power Automate, mantendo as funcoes:

1. Importar dados do Excel para base de simulacao.
2. Atualizar historico e base local.
3. Gerar graficos em base64 para o front.
4. Gerar relatorio e disponibilizar download temporario.

## Mapeamento de Flows para API

1. Flow `SIM_IMPORTARDADOS` + flow com upload de arquivo:
- Antes: PowerApps envia arquivo, flow grava no SharePoint, le tabela do Excel e cria itens.
- Agora: `POST /api/importar-dados` (multipart: `arquivo`, `usuario`) parseia planilha e retorna registros normalizados.
- O fluxo de importação em massa passou a ser feito diretamente pelo portal via Excel.

2. Flow `Fluxo atualizacao tabela base Simulador`:
- Antes: executa Office Script e retorna JSON/base64.
- Agora: `POST /api/atualizar-historico` (stub) permanece local e pode ser expandido sem depender de SharePoint.

3. Flows `GraficoExcel`, `GraficoExcel1`, `GraficoExcel2`, `TabelaCad`:
- Antes: executa script no Excel e retorna `image` em base64.
- Agora: `POST /api/graficos/:tipo` retorna `imageBase64` para o front.
- Proximo passo: trocar grafico placeholder por consulta real de dados e renderizacao de grafico final.

4. Flow `FlowGerarRelatorio`:
- Antes: cria arquivo HTML no SharePoint, devolve link, apaga arquivo apos 1 minuto.
- Agora: `POST /api/relatorios/gerar` gera PDF com Puppeteer e devolve link `GET /api/relatorios/:id`.
- Expiracao automatica configurada por `REPORT_TTL_SECONDS` (padrao 60s).

## Endpoints implementados

1. `GET /api/health`
2. `POST /api/importar-dados`
3. `POST /api/graficos/:tipo`
4. `POST /api/relatorios/gerar`
5. `GET /api/relatorios/:id`
6. `POST /api/atualizar-historico`

## Integracao no Front do Portal

1. Tela Importacao:
- Envia arquivo `.xlsx` e nome de usuario para `POST /api/importar-dados`.
- Exibe resumo (`total`, `amostra`).

2. Tela Dashboard/Graficos:
- Chama `POST /api/graficos/capex` (ou outro tipo).
- Exibe string `imageBase64` em `<img src="..." />`.

3. Tela Relatorio:
- Monta HTML e chama `POST /api/relatorios/gerar`.
- Faz download pelo `downloadPath` retornado.

## Passos para producao

1. Manter o fluxo de importação em Excel como fonte principal de carga em massa.
2. Implementar persistencia de `importar-dados` na base local final.
3. Substituir geracao de grafico placeholder por fonte real (dados da base).
4. Adicionar autenticacao do usuario no portal e auditoria de chamadas.
