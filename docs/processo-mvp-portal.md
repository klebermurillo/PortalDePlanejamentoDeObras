# Processo MVP do Portal (sem Microsoft)

## Escopo desta fase

1. Tela inicial com acesso para dois sistemas:
- Simulador de Cenarios
- Tarifador

2. Operacao local sem PowerApps/Power Automate e sem integração com SharePoint.

3. Dados mantidos em SQLite local.

4. Sem autenticacao nesta etapa.

## Fluxo Simulador

1. Cadastro manual de registro.
2. Edicao de registro existente.
3. Exclusao de registro.
4. Upload em massa por Excel.
5. Download de modelo Excel pelo proprio portal.
6. Geracao de relatorio PDF da lista exibida.

## Fluxo Tarifador (fase inicial)

1. Tela de entrada pronta no portal.
2. Simulacao local basica de tarifa para validar UX.
3. Regras finais e persistencia podem ser evoluidas na proxima iteracao.

## Enderecos do portal

1. Home: `/`
2. Simulador: `/simulador.html`
3. Tarifador: `/tarifador.html`

## Observacoes

1. O backend atual ja possui API para o Simulador e servico de PDF.
2. Integrações futuras permanecem desacopladas e podem ser adicionadas sem depender de SharePoint.
