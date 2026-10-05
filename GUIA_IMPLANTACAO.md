# Manual de Implantação e Operação
## Sistema de Satisfação do Cidadão • Dívida Ativa da PGM de São João de Meriti

Este manual orienta a equipe de TI, a Coordenação da Dívida Ativa e os gestores da Procuradoria Geral do Município de São João de Meriti sobre como implantar, operar e manter o sistema em funcionamento no totem físico, tablets de balcão e integrado ao Google Sheets.

---

## 🚀 1. Execução Imediata (Ambiente Local / Totem Físico)

O sistema foi concebido com arquitetura estática moderna (Zero Dependências externas pesadas), o que significa que funciona instantaneamente em qualquer computador, tablet ou totem.

1. Navegue até a pasta:
   ```text
   z:\Projetos de Sistemas\Antigravity\Projetos Wallace\Sistema de Satisfação\
   ```
2. Dê um duplo clique no arquivo [`index.html`](index.html) para abri-lo no seu navegador padrão (Google Chrome, Microsoft Edge ou Firefox).
3. **Modo Kiosk (Totem de Tela Cheia):**
   - Para colocar em um totem dedicado na recepção da Dívida Ativa, pressione a tecla `F11` para ativar a tela cheia.
   - O sistema retornará automaticamente para a tela inicial 5 segundos após cada avaliação preenchida.

---

## ☁️ 2. Conexão com Google Sheets (Backend Serverless)

Para que as avaliações dos cidadãos e os **cadastros de atendentes e assuntos** sejam salvos automaticamente na planilha Google da Procuradoria, siga os passos abaixo:

### Passo 2.1 — Criar ou Abrir a Planilha Google
1. Acesse o seu Google Drive com a conta institucional da Procuradoria ou Prefeitura.
2. Crie uma nova Planilha Google em branco (ou abra a existente) e renomeie-a para:  
   `PGM - Banco de Dados de Satisfação da Dívida Ativa`.

### Passo 2.2 — Abrir o Editor do Google Apps Script
1. No menu superior da planilha, clique em **Extensões** > **Apps Script**.
2. Abra o arquivo [`Code.gs`](file:///g:/Projetos%20de%20Sistemas/Antigravity/Projetos%20Wallace/Sistema%20de%20Satisfa%C3%A7%C3%A3o/Code.gs) do projeto local, copie todo o seu conteúdo e substitua o código no editor do Apps Script.
3. Clique no ícone de **Salvar** (ou pressione `Ctrl + S`).

### Passo 2.3 — Implantar como Aplicativo da Web (Web App)
1. No canto superior direito do Apps Script, clique no botão azul **Implantar**:
   - **Se for primeira implantação:** Clique em **Nova implantação** > tipo **App da Web**.
   - **Se já possuir uma implantação ativa:** Clique em **Gerenciar implantações** > ícone de **Lápis (Editar)** > selecione **Versão: Nova versão** e clique em **Implantar**.
2. Preencha as configurações rigorosamente conforme abaixo:
   - **Descrição:** `API v2.0 - Avaliações, Métricas, Atendentes e Assuntos - Dívida Ativa SJM`
   - **Executar como:** `Eu (seu-email@gmail.com ou institucional)`
   - **Quem tem acesso:** `Qualquer pessoa` *(essencial para que o totem e celulares consigam enviar as avaliações e sincronizar cadastros sem exigir login do munícipe)*.
3. Clique em **Implantar**.
4. Se solicitado, conceda a **Autorização de Acesso** à sua conta Google.
5. Copie a **URL do app da Web** gerada (terminada em `/exec`).

### Passo 2.4 — Vincular a URL no Sistema
1. Abra o arquivo [`index.html`](file:///g:/Projetos%20de%20Sistemas/Antigravity/Projetos%20Wallace/Sistema%20de%20Satisfa%C3%A7%C3%A3o/index.html) no navegador.
2. No menu superior, clique em **Configurações**.
3. No campo **URL da Web App do Google Apps Script**, cole a URL copiada.
4. Clique em **Salvar Configurações** e em seguida em **Testar Conexão**.
5. Pronto! O badge no topo indicará `Sheets Conectado` e gerenciará as seguintes abas:
   - **`Respostas_Pesquisa`:** Armazena todas as avaliações em tempo real.
   - **`Metricas_Consolidadas`:** Fórmulas executivas de CSAT, FCR e Agilidade.
   - **`Atendentes`:** Lista completa dos servidores municipais cadastrados.
   - **`Assuntos_Servicos`:** Catálogo completo de serviços tributários.
   - **`Usuarios_Acesso`:** Usuários, permissões e senhas criptografadas em hash SHA-256 (máxima segurança, sem texto puro).
6. Na tela **Cadastros**, você pode clicar em **"Sincronizar da Planilha"** ou **"Enviar Base para Planilha"** a qualquer momento!
7. Na aba **Configurações** > **Gestão de Perfis**, as credenciais de acesso são sincronizadas automaticamente com a nuvem sob criptografia SHA-256.

---

## 📱 3. Uso em Dispositivos Móveis e QR Code nas Mesas de Atendimento

Além do totem presencial, o sistema possui gerador integrado de QR Code:
1. No rodapé da pesquisa do totem, clique no botão **Responder no Celular**.
2. Um QR Code de alta resolução será exibido na tela.
3. Você pode imprimir este QR Code e disponibilizá-lo em displays de acrílico nas mesas e balcões de atendimento de cada servidor.
4. O cidadão aponta a câmera do celular enquanto aguarda a emissão das guias e responde confortavelmente do próprio smartphone.

---

## 📈 4. Geração do Relatório Executivo Oficial para o Prefeito

1. No menu superior, acesse a aba **Relatório Executivo**.
2. O sistema calculará automaticamente o diagnóstico técnico do período selecionado, comparando os resultados contra as metas institucionais (CSAT ≥ 85%, FCR ≥ 80%, Clareza ≥ 4.0, Agilidade ≥ 75%).
3. Clique no botão **Imprimir / Salvar em PDF** no topo direito.
4. Na tela de impressão do navegador:
   - **Destino:** Salvar como PDF
   - **Layout:** Retrato
   - **Tamanho do Papel:** A4
   - **Margens:** Padrão
5. O PDF gerado estará formatado com brasão oficial, diagramação ministerial, diagnóstico de arrecadação e campos formais para assinatura da Coordenação e do Procurador-Chefe.

---

## 📊 5. Integração com Microsoft PowerBI / Excel

Para análises avançadas no PowerBI da Prefeitura:
1. No **Painel de KPIs**, clique no botão **Exportar CSV**.
2. O sistema baixará o arquivo estruturado com codificação `UTF-8 com BOM` e delimitador `;`, abrindo nativamente no Excel sem desconfigurar acentos.
3. Caso queira conectar o PowerBI diretamente ao Google Sheets, basta utilizar o conector web do PowerBI apontando para a planilha Google criada no Passo 2.1.
