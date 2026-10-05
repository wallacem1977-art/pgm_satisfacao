# Dicionário de Dados & Metodologia de Indicadores (CX)
## Setor de Dívida Ativa • Procuradoria Geral do Município de São João de Meriti

Este documento estabelece o padrão técnico de **Engenharia de Dados** e as diretrizes de **Experiência do Cidadão (CX - Citizen Experience)** para a mensuração, monitoramento contínuo e governança da qualidade do atendimento na Dívida Ativa da PGM de São João de Meriti.

---

## 🏛️ 1. Contexto e Objetivos Estratégicos

O setor de Dívida Ativa da Procuradoria Geral do Município possui um papel duplo de alta relevância:
1. **Fiscal e Arrecadatório**: Recuperar créditos tributários (IPTU, ISS, Taxas) e não tributários essenciais para o custeio das políticas públicas municipais (saúde, educação, saneamento).
2. **Cidadania e Acolhimento Social**: Atender contribuintes que, muitas vezes, enfrentam dificuldades financeiras ou dúvidas complexas sobre execuções fiscais, exigindo atendimento empático, transparente e resolutivo.

O sistema de pesquisa estruturado visa fornecer **subsídios técnicos e auditáveis** para tomada de decisão da gestão (Prefeito, Procurador-Geral e Coordenador da Dívida Ativa).

---

## 📊 2. Estrutura Metodológica das 5 Perguntas e Indicadores (KPIs)

### 1. CSAT (Citizen Satisfaction Score) — Avaliação Geral
- **Pergunta ao Cidadão:**  
  *“Em uma escala de 1 a 5, como você avalia a qualidade geral do atendimento recebido hoje no setor de Dívida Ativa?”*  
  *(1 - Muito Insatisfeito a 5 - Muito Satisfeito)*
- **Fórmula de Engenharia:**
  $$\text{CSAT (\%) Top-2 Box} = \left( \frac{\text{Qtd de Notas 4 (Satisfeito) e 5 (Muito Satisfeito)}}{\text{Total de Respostas Válidas}} \right) \times 100$$
  $$\text{CSAT (Média Ponderada)} = \frac{\sum_{i=1}^{N} \text{Nota}_i}{N}$$
- **Faixas de Benchmark no Setor Público:**
  - `≥ 85%`: **Excelente / Padrão Ouro**
  - `70% a 84%`: **Bom / Adequado**
  - `50% a 69%`: **Regular / Ponto de Atenção**
  - `< 50%`: **Crítico / Risco Institucional**
- **Como Apresentar ao Prefeito / Procurador:**  
  É o número central do relatório executivo. Demonstra o percentual de aprovação da população atendida presencialmente, servindo de termômetro da imagem da Procuradoria e da Administração Municipal perante a sociedade.

---

### 2. FCR (First Contact Resolution) — Resolutividade
- **Pergunta ao Cidadão:**  
  *“O motivo da sua ida à Dívida Ativa (acordos, emissão de guias, dúvidas processuais) foi resolvido neste atendimento?”*  
  *(Opções: Sim, totalmente / Parcialmente / Não)*
- **Fórmula de Engenharia:**
  $$\text{Taxa de Resolução Total (\%)} = \left( \frac{\text{Qtd de 'Sim, totalmente'}}{\text{Total de Atendimentos}} \right) \times 100$$
  $$\text{Taxa de Resolução Parcial (\%)} = \left( \frac{\text{Qtd de 'Parcialmente'}}{\text{Total de Atendimentos}} \right) \times 100$$
- **Relevância Operacional e Financeira:**
  - Cada atendimento não resolvido gera um "cidadão de retorno" (reincidência na fila), duplicando o custo operacional do servidor público e aumentando o tempo de espera dos demais.
  - Uma alta taxa de "Sim" (> 80%) atesta a autonomia, competência técnica e preparo dos servidores de balcão para fechar acordos e emitir guias na primeira interação.

---

### 3. Índice de Clareza e Transparência Jurídico-Tributária
- **Pergunta ao Cidadão:**  
  *“As explicações fornecidas pelo atendente sobre os seus débitos e as opções de parcelamento foram claras e fáceis de entender?”*  
  *(Opções: 1 - Nada claras a 5 - Muito claras)*
- **Fórmula de Engenharia:**
  $$\text{Média de Clareza} = \frac{\sum_{i=1}^{N} \text{Nota Clareza}_i}{N} \quad (\text{Escala de 1.0 a 5.0})$$
  $$\text{Taxa de Compreensão Plena (\%)} = \left( \frac{\text{Notas 4 e 5}}{\text{Total}} \right) \times 100$$
- **Impacto Direto na Arrecadação:**
  - O direito tributário e os cálculos de acréscimos legais (juros de mora, multa, correção monetária e custas) são de difícil compreensão para o leigo.
  - Se o contribuinte compreende a composição da dívida e a real vantagem dos descontos no pagamento à vista ou parcelado, **a taxa de adesão e o cumprimento efetivo das parcelas cresce em até 300%**. Este KPI mede a capacidade da equipe de desmistificar o "juridiquês".

---

### 4. Agilidade Percebida & Logística de Fila
- **Pergunta ao Cidadão:**  
  *“Como você avalia o tempo total do seu atendimento, desde a retirada da senha/chegada até a conclusão do caso?”*  
  *(Opções: Muito Rápido / Adequado / Demorado / Muito Demorado)*
- **Fórmula de Engenharia:**
  $$\text{Índice de Agilidade Positiva (\%)} = \left( \frac{\text{Muito Rápido} + \text{Adequado}}{\text{Total}} \right) \times 100$$
  $$\text{Índice de Gargalo / Fila (\%)} = \left( \frac{\text{Demorado} + \text{Muito Demorado}}{\text{Total}} \right) \times 100$$
- **Subsídio para Gestão e Dimensionamento:**
  - Mede o gargalo operacional. É o dado exato para justificar, com base técnica irrefutável perante a Secretaria de Fazenda/Administração:
    - Necessidade de abertura de novos guichês de triagem;
    - Alocação de novos servidores/estagiários;
    - Aquisição de computadores e impressoras mais rápidas;
    - Comprovação do sucesso de uma nova rotina ou fluxo de senhas implantado.

---

### 5. Experiência Qualitativa, NLP e Nuvem de Palavras
- **Pergunta Aberta ao Cidadão:**  
  *“Em poucas palavras, como foi a sua experiência com a nossa equipe hoje? Use este espaço para deixar sugestões de melhoria, críticas ou elogios.”*
- **Pipeline de Processamento de Linguagem Natural (NLP):**
  1. **Limpeza e Normalização**: Remoção de acentuação, caracteres especiais e conversão para caixa baixa (*lowercase*).
  2. **Filtragem de Stopwords**: Eliminação de pronomes, preposições e artigos da língua portuguesa (ex: *de, a, o, em, para, com*).
  3. **Classificação Léxica de Sentimento**:
     - *Positivo*: Presença de termos como *atencioso, rápido, educado, ótimo, parabéns, esclareceu, desconto, prestativo, excelente*.
     - *Negativo*: Presença de termos como *demora, fila, espera, sistema lento, fora do ar, confuso, mal educado, burocracia*.
     - *Neutro*: Comentários estritamente factuais ou ausência de termos de polaridade acentuada.
  4. **Nuvem de Palavras Interativa**: Frequência ponderada com destaque visual das palavras mais citadas para identificação rápida de anomalias ou tendências.

---

## 🗄️ 3. Dicionário de Dados do Esquema de Armazenamento

| Campo | Tipo | Descrição Técnica | Exemplos / Domínio |
| :--- | :--- | :--- | :--- |
| `id` | String | Código identificador único / protocolo oficial do feedback | `SJM-DA-2026-00101` |
| `timestamp` | Datetime ISO | Data e hora universal do registro em UTC | `2026-10-02T13:40:00.000Z` |
| `data` | Date (YYYY-MM-DD) | Data local de São João de Meriti para partição e filtros | `2026-10-02` |
| `hora` | Time (HH:mm:ss) | Hora local da finalização da pesquisa | `10:40:00` |
| `atendente` | String (Dimensão) | Nome do Atendente / Servidor Público avaliado no exercício da função | `Carlos Eduardo Ramos`, `Ana Paula Silva`, `Juliana Mendes` |
| `tipo_servico` | String (Dimensão) | Natureza principal da demanda do munícipe | `Acordo / Parcelamento de IPTU`, `Emissão de DAM` |
| `q1_csat` | Integer (1 a 5) | Nota numérica de satisfação geral | `1, 2, 3, 4, 5` |
| `q2_fcr` | String | Indicador de resolução no primeiro contato | `Sim, totalmente`, `Parcialmente`, `Não` |
| `q3_clareza` | Integer (1 a 5) | Grau de transparência nas explicações dos débitos | `1, 2, 3, 4, 5` |
| `q4_agilidade` | String | Percepção subjetiva de tempo e fila | `Muito Rápido`, `Adequado`, `Demorado`, `Muito Demorado` |
| `q5_comentario`| Text (Livre) | Texto aberto espontâneo do munícipe (até 500 caracteres)| *"Atendente prestativo, parcelou meu IPTU com desconto."* |
| `sentimento` | String (Calculado)| Classificação algorítmica de sentimento do comentário | `Positivo`, `Neutro`, `Negativo` |
| `canal` | String | Origem do preenchimento da pesquisa | `Totem Presencial`, `QR Code Celular`, `Web` |

> [!NOTE]
> **Avaliação Individual no Exercício da Função Pública**:  
> A substituição da dimensão física (*guichê/ponto*) pelo **Nome do Atendente / Servidor** permite à Procuradoria e à Prefeitura acompanhar métricas individuais de desempenho (CSAT individual, taxa de resolutividade FCR, clareza didática dos cálculos e agilidade percebida), subsidiando programas de mérito funcional, bonificação, capacitação contínua e realocação estratégica de pessoal.

---

## 🎯 4. Matriz de Governança e Alertas Automáticos

| Condição Operacional | Nível de Alerta | Ação de Gestão Recomendada |
| :--- | :--- | :--- |
| **CSAT Geral < 75%** | ⚠️ Alerta Amarelo | Auditoria amostral de atendimentos e reciclagem de atendimento humanizado. |
| **FCR < 70%** | 🔴 Alerta Vermelho | Revisar permissões de sistema e alçada dos servidores para fechar guias na hora. |
| **Agilidade Demorada > 30%** | ⚠️ Alerta Amarelo | Ativar triagem prévia obrigatória na porta da Dívida Ativa para conferência de documentos. |
| **Clareza dos Débitos < 3.8** | ⚠️ Alerta Amarelo | Disponibilizar cartilha visual simplificada com o cálculo do parcelamento ao cidadão. |
| **Sentimento Negativo > 20%** | 🔴 Alerta Vermelho | Convocação imediata de reunião com a coordenação para tratar gargalos apontados na nuvem de palavras. |

---

## 🔒 5. Matriz de Perfis de Acesso & Segurança (RBAC)

Para preservar a integridade das métricas, a soberania das regras de negócio e a facilidade de uso pelo contribuinte, o sistema adota o modelo de Controle de Acesso Baseado em Funções (*Role-Based Access Control - RBAC*):

| Recurso / Módulo do Sistema | Cidadão (Público) | Gestor Operacional | Administrador Geral |
| :--- | :---: | :---: | :---: |
| **Totem de Pesquisa (Físico)** | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Totem via QR Code Móvel** | ✅ Permitido (`?perfil=cidadao`) | ✅ Permitido | ✅ Permitido |
| **Painel de Inteligência / KPIs** | ❌ Bloqueado | ✅ Permitido | ✅ Permitido |
| **Filtros e Desempenho por Servidor** | ❌ Bloqueado | ✅ Permitido | ✅ Permitido |
| **Exportação CSV e Backup JSON** | ❌ Bloqueado | ✅ Permitido | ✅ Permitido |
| **Relatório Executivo Oficial (A4/PDF)**| ❌ Bloqueado | ✅ Permitido | ✅ Permitido |
| **Cadastros Operacionais (Atendentes & Assuntos)**| ❌ Bloqueado | ❌ Bloqueado | ✅ Permitido |
| **Configuração de Metas (CSAT/FCR)** | ❌ Bloqueado | ❌ Bloqueado | ✅ Permitido |
| **Integração Google Sheets / Apps Script**| ❌ Bloqueado | ❌ Bloqueado | ✅ Permitido |
| **Cadastro de Usuários e Gestão de Senhas**| ❌ Bloqueado | ❌ Bloqueado | ✅ Permitido |

---

## 🗂️ 6. Entidades de Dados Cadastrais & Armazenamento em Nuvem (Google Sheets)

### A. Dimensão Atendente / Servidor Público (`SJM_CX_ATTENDANTS_V1`)
- **Aba na Planilha Google:** `Atendentes`
- **Mapeamento de Colunas:**
  - `ID_Atendente` (`A`): Identificador único do servidor (`att-{timestamp}`).
  - `Nome_Atendente_Servidor` (`B`): Nome completo do servidor avaliado no exercício da função (ex: *"Carlos Eduardo Ramos"*).
  - `Especialidade_Guiche_Lotacao` (`C`): Especialidade, lotação funcional ou guichê (ex: *"Negociação & Acordos / Guichê 01"*).
  - `Ativo_Totem` (`D`): Booleano (`true`/`false`) indicando se o servidor está ativo para seleção no Totem.
  - `Data_Cadastro` (`E`): Timestamp ISO ou data do cadastro no sistema.

### B. Dimensão Assunto Principal / Serviço (`SJM_CX_SERVICES_V1`)
- **Aba na Planilha Google:** `Assuntos_Servicos`
- **Mapeamento de Colunas:**
  - `ID_Assunto` (`A`): Identificador único da demanda (`srv-{timestamp}`).
  - `Descricao_Assunto` (`B`): Descrição da demanda ou serviço municipal (ex: *"Acordo / Parcelamento de IPTU"*).
  - `Categoria_Ramo` (`C`): Ramo tributário (ex: *"Tributário Imobiliário"*, *"Tributário Mobiliário"*, *"Arrecadação & Pagamento"*, *"Contencioso Judicial"*).
  - `Ativo_Totem` (`D`): Booleano (`true`/`false`) indicando se o assunto está visível no Totem Cidadão.
  - `Data_Cadastro` (`E`): Timestamp ISO ou data do cadastro no sistema.

---

## ☁️ 7. Governança e Sincronização Serverless

O backend serverless em **Google Apps Script (`Code.gs`)** consolida 4 abas estruturadas na mesma planilha institucional:

1. **`Respostas_Pesquisa`:** Tabela fato com as avaliações dos munícipes captadas via Totem e QR Code.
2. **`Metricas_Consolidadas`:** Painel executivo com fórmulas nativas do Sheets para conferência da Auditoria e Prefeito.
3. **`Atendentes`:** Tabela dimensão mestra de servidores públicos avaliados no exercício da função.
4. **`Assuntos_Servicos`:** Tabela dimensão mestra de serviços e assuntos tributários disponibilizados.




