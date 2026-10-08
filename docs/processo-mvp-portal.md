# Processo MVP do SIGPO

## Escopo desta fase

1. Portal web com acesso ao Simulador de Cenários, aos cadastros administrativos e ao protótipo do Tarifador.

2. Operação independente de PowerApps/Power Automate e sem integração ativa com SharePoint.

3. Dados operacionais mantidos em MySQL.

4. Login por e-mail e senha, com sessão armazenada no servidor e perfis de administrador e usuário.

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

## Observações

1. O backend possui API para o Simulador, importação de Excel e geração de PDF.
2. As simulações e cadastros dependem da configuração MySQL descrita no README principal.
3. Integrações futuras permanecem desacopladas e podem ser adicionadas sem depender de SharePoint.
