# Sistema de Satisfação do Cidadão & Monitoramento de KPIs (CX)
### Procuradoria Geral do Município de São João de Meriti • Setor de Dívida Ativa

Sistema completo de **Pesquisa de Satisfação do Cidadão (Totem Kiosk & Mobile)** e **Painel de Inteligência de CX & Métricas Operacionais (BI)**, desenvolvido sob a ótica de Engenharia de Dados, Governança de Acesso e Experiência do Cidadão no Setor Público.

---

## 🔐 Controle de Acesso e Perfis de Usuário

O sistema implementa uma camada de segurança com **três perfis de acesso bem definidos**, garantindo sigilo administrativo, integridade de configurações e total comodidade ao contribuinte:

| Perfil | Requer Login? | Nível de Permissão | Escopo de Acesso |
| :--- | :---: | :--- | :--- |
| **👑 Administrador** | **Sim** | **Acesso Total Irrestrito** | Acesso completo a todas as áreas: Totem, Painel de KPIs, Relatório Executivo Oficial, Cadastros Operacionais (Atendentes e Assuntos), Integração Cloud/Sheets e Gestão de Usuários/Senhas. |
| **💼 Gestor** | **Sim** | **Acesso Operacional & BI** | Totem Cidadão, Painel Analítico de KPIs, Relatório Executivo e Status da Conexão. **Bloqueado em Cadastros Operacionais e Configurações do Sistema.** |
| **👥 Cidadão** | **NÃO** | **Totem Público de Satisfação** | **Interface Limpa (Modo Totem Kiosk):** menus administrativos (KPIs, Relatórios, Cadastros, Configurações) e status do Google Sheets são **100% ocultos**. Permanece apenas a pesquisa e o botão **"Acesso Restrito"** para autenticação de servidores. |

### 🔑 Credenciais Padrão para Demonstração e Homologação

| Usuário | Senha Padrão | Perfil | Descrição |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **Administrador** | Gestão geral, auditoria de métricas, cadastros de equipe/serviços e configurações |
| `gestor` | `gestor123` | **Gestor** | Supervisão de atendimento, análise de KPIs e relatórios executivos |
| *(Público)* | *(Sem senha)* | **Cidadão** | Totem físico e link via QR Code (`?perfil=cidadao`). Menus internos ocultos. |

> [!TIP]
> O perfil **Administrador** pode **cadastrar novos usuários** (como Gestores ou Administradores), **redefinir senhas**, **excluir contas** e ativar a flag **"Exigir troca de senha no primeiro acesso"** (forçando o servidor a criar uma nova senha pessoal confidencial no primeiro login), tudo na aba **Configurações** > **Gestão de Perfis e Credenciais de Acesso**.

> [!IMPORTANT]
> **Armazenamento Seguro em Nuvem com Criptografia SHA-256:**
> - **Criptografia / Hash Criptográfico Unidirecional (NIST SHA-256):** Nenhuma senha é armazenada ou visível em texto puro. Todas as senhas (padrão, cadastradas ou alteradas) são processadas por hash criptográfico SHA-256 de 256 bits (64 caracteres hexadecimais), tanto no frontend (`app.js`) quanto no backend (`Code.gs`).
> - **Persistência Centralizada no Google Sheets:** As contas, perfis, hashes criptografados e status de primeiro acesso são persistidos de forma segura na aba **`Usuarios_Acesso`** da Planilha Google (`Code.gs` v2.1.0).
> - **Sincronização Imediata:** Qualquer usuário criado ou senha alterada reflete instantaneamente em todos os totens e estações de trabalho da Prefeitura.
> - **Migração e Atualização Transparente:** Caso existam registros legados em texto puro na planilha, o sistema autentica e converte automaticamente a credencial para o hash criptográfico seguro SHA-256 no primeiro login, sem bloqueio de usuários.

---

## 📋 Tela de Cadastros Operacionais (Atendentes & Assuntos na Nuvem)

O sistema conta com a tela dedicada **"Cadastros"** (`#viewCadastros`), com **acesso exclusivo para o perfil Administrador** (o perfil Gestor não realiza cadastros), garantindo governança sobre a equipe de atendimento e catálogo de serviços da Dívida Ativa com **armazenamento direto na Planilha Google**:

1. **Cadastro & Gestão de Atendentes / Servidores:**
   - Permite cadastrar o nome completo do servidor e sua especialidade/guichê de atendimento (ex: *"Carlos Eduardo Ramos - Negociação & Acordos"*).
   - **Persistência na Planilha Google:** Todos os registros são gravados na aba **`Atendentes`** da planilha, permitindo que a coordenação edite tanto pelo sistema quanto diretamente no Google Sheets.
   - Possui controle de status (**Ativo / Inativo**), permitindo ocultar temporariamente um servidor do Totem em caso de férias, licença ou remanejamento sem apagar seu histórico.
   - Computa em tempo real a quantidade de avaliações vinculadas ao servidor.
   - Fornece exclusão com salvaguarda de integridade (impede exclusão do último atendente da base).

2. **Cadastro & Gestão de Assuntos Principais (Serviços):**
   - Permite cadastrar os serviços e assuntos tributários demandados pelos contribuintes (ex: *"Acordo / Parcelamento de IPTU"*, *"Emissão de DAM"*, *"Execução Fiscal"*).
   - **Persistência na Planilha Google:** Todos os serviços são gravados na aba **`Assuntos_Servicos`** da planilha oficial.
   - Classificação por ramo tributário (Imobiliário, Mobiliário, Arrecadação, Contencioso, etc.).
   - Controle de status ativo/inativo e contagem em tempo real de avaliações computadas.

3. **Sincronização Bidirecional Dinâmica:**
   - Qualquer atendente ou assunto cadastrado, ativado ou desativado reflete instantaneamente nos selects do **Totem Cidadão**, nos filtros do **Painel de KPIs** e na Planilha Google, sem necessidade de recarregar a página.
   - Botões na tela de cadastros permitem **"Sincronizar da Planilha"** (puxar atualizações feitas na nuvem) ou **"Enviar Base para Planilha"** (fazer upload em lote).

---

## 🎯 As 5 Dimensões Estratégicas Monitoradas

| Dimensão | Indicador Chave | Relevância para a Gestão Pública |
| :--- | :--- | :--- |
| **1. Avaliação Geral** | **CSAT** (*Citizen Satisfaction Score*) | Percentual de aprovação pública dos serviços da Dívida Ativa. Principal número para o Prefeito e Procurador-Geral. |
| **2. Resolutividade** | **FCR** (*First Contact Resolution*) | Comprova a eficiência técnica dos servidores, medindo atendimentos que não geram retorno à fila nem retrabalho. |
| **3. Clareza & Transparência** | **CTI** (*Clarity & Transparency Index*) | Liga atendimento à arrecadação. Se o munícipe compreende o cálculo do débito e o desconto, a chance de fechar o acordo aumenta expressivamente. |
| **4. Agilidade** | **PAI** (*Perception of Agility Index*) | Mede a percepção do tempo de fila e subsidia tecnicamente a avaliação da equipe de atendimento e triagem. |
| **5. Voz do Cidadão** | **NLP & Nuvem de Palavras** | Análise algorítmica de sentimento (elogios, neutros e críticas) e extração de termos recorrentes nos comentários abertos. |
| **6. Desempenho Funcional** | **Avaliação por Servidor** | Avaliação individualizada de desempenho do servidor público no exercício da função (CSAT, resolutividade, didática e agilidade). |

---

## 📂 Arquitetura dos Arquivos

```text
Sistema de Satisfação/
├── index.html                 # Interface unificada (Totem Cidadão, Dashboard BI, Relatório, Config e Modal de Login)
├── style.css                  # Design institucional PGM, Dark/Light Mode, Glassmorphism, Badges e Print A4
├── app.js                     # Motor de dados, cálculo de KPIs, NLP léxico, controle de perfis/rotas e exportações
├── Code.gs                    # Backend Serverless em Google Apps Script para Google Sheets
├── DICIONARIO_DADOS_KPIS.md   # Metodologia matemática de CX, Star Schema, matriz de governança e matriz RBAC
├── GUIA_IMPLANTACAO.md        # Passo a passo de instalação no totem, nuvem e emissão de relatórios
├── logo_sjm.png               # Brasão oficial da Prefeitura de São João de Meriti
└── README.md                  # Apresentação do projeto e manual de perfis
```

---

## ⚡ Como Usar

1. **Acesso do Cidadão (Totem Kiosk & Mobile):**
   - **No Totem físico:** Interface 100% limpa e intuitiva, sem menus administrativos ou indicadores técnicos expostos. A identificação do **Atendente/Servidor** e do **Assunto Principal** inicia vazia e é de **preenchimento obrigatório**, garantindo que toda avaliação seja atribuída com precisão ao guichê e serviço correto.
   - **Pelo Smartphone:** O cidadão pode escanear a placa com QR Code fixada no guichê ou acessar o link direto (`?perfil=cidadao`), respondendo com total comodidade e privacidade.
2. **Acesso do Gestor / Administrador:**
   - Clique em **"Acesso Restrito"** no canto superior direito.
   - Digite o usuário e senha correspondentes (`admin` ou `gestor`).
   - No **Painel de KPIs**, use os filtros dinâmicos e clique em **"Imprimir PDF"** para gerar um relatório formal em formato **A4 Paisagem (Landscape)** com brasão da PGM, metadados dos filtros ativos e gráficos em alta fidelidade cromática.
3. **Divulgação do QR Code & Placa de Balcão (Configurações):**
   - Na aba **Configurações** (acesso exclusivo do Administrador), localize o card **"Divulgação da Pesquisa Móvel (QR Code & Link Público)"**.
   - **Copiar Link:** Copia o link público seguro com parâmetro `?perfil=cidadao`.
   - **Baixar Imagem (PNG):** Baixa o QR Code em alta resolução (400x400) para designers e peças gráficas.
   - **Imprimir Placa de Balcão (A4):** Gera e abre imediatamente para impressão uma placa institucional com o brasão oficial de São João de Meriti, chamada de engajamento do cidadão e QR Code enquadrado para displays acrílicos de balcão e guichês.
4. **Nuvem & Google Sheets:**
   - Siga as instruções do [`GUIA_IMPLANTACAO.md`](GUIA_IMPLANTACAO.md) para vincular a planilha de auditoria da Prefeitura.
