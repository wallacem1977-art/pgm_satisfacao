/**
 * ==========================================================================
 * SISTEMA DE SATISFAÇÃO DO CIDADÃO & MONITORAMENTO DE KPIS (CX)
 * Procuradoria Geral do Município de São João de Meriti - Dívida Ativa
 * Backend Serverless em Google Apps Script (Code.gs)
 * ==========================================================================
 */

// Nomes das abas da planilha Google
const SHEETS = {
  RESPONSES: 'Respostas_Pesquisa',
  METRICS: 'Metricas_Consolidadas',
  CONFIG: 'Configuracoes',
  ATTENDANTS: 'Atendentes',
  SERVICES: 'Assuntos_Servicos',
  USERS: 'Usuarios_Acesso'
};

// Atendentes e Servidores Padrão da Dívida Ativa
const DEFAULT_ATTENDANTS = [
  ['att-1', 'Carlos Eduardo Ramos', 'Negociação & Acordos / Guichê 01', true, new Date().toISOString()],
  ['att-2', 'Ana Paula Silva', 'Atendimento Preferencial / Guichê 04', true, new Date().toISOString()],
  ['att-3', 'Juliana Mendes', 'Negociação & Parcelamento / Guichê 02', true, new Date().toISOString()],
  ['att-4', 'Roberto Souza', 'Emissão de Guias e DAM / Guichê 03', true, new Date().toISOString()],
  ['att-5', 'Lucas Ferreira', 'Análise Processual / Guichê 05', true, new Date().toISOString()],
  ['att-6', 'Mariana Costa', 'Triagem & Recepção', true, new Date().toISOString()],
  ['att-7', 'Adilson', 'Atendimento Tributário / Dívida Ativa', true, new Date().toISOString()],
  ['att-8', 'Servidor(a) Geral', 'Plantão Geral de Atendimento', true, new Date().toISOString()]
];

// Assuntos Principais e Tipos de Serviços da Dívida Ativa
const DEFAULT_SERVICES = [
  ['srv-1', 'Acordo / Parcelamento de IPTU', 'Tributário Imobiliário', true, new Date().toISOString()],
  ['srv-2', 'Emissão de DAM / Guia Única', 'Arrecadação & Pagamento', true, new Date().toISOString()],
  ['srv-3', 'Débitos de ISS / Taxas Mobiliárias', 'Tributário Mobiliário', true, new Date().toISOString()],
  ['srv-4', 'Consulta a Processo de Execução Fiscal', 'Contencioso Judicial', true, new Date().toISOString()],
  ['srv-5', 'Bloqueio de Conta Bancária', 'Execuções & Bloqueios Judiciais', true, new Date().toISOString()],
  ['srv-6', 'Baixa de Inscrição', 'Cancelamentos & Regularidade Cadastral', true, new Date().toISOString()],
  ['srv-7', 'Certidão Positiva com Efeito de Negativa', 'Certidões & Regularidade', true, new Date().toISOString()],
  ['srv-8', 'Outros Esclarecimentos', 'Atendimento Geral', true, new Date().toISOString()]
];

// Usuários e Credenciais Padrão do Sistema (com criptografia SHA-256)
const DEFAULT_USERS = [
  ['admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Administrador PGM', 'Procurador / Administrador Geral', 'admin.pgm@sjm.rj.gov.br', false, new Date().toISOString()],
  ['gestor', '18f2b94d784d03c222cb7c47148cdb8457f1ef3eaf3e317711f25d55747f6a35', 'gestor', 'Gestor Operacional', 'Supervisor de Atendimento ao Contribuinte', 'gestor.dividaativa@sjm.rj.gov.br', false, new Date().toISOString()]
];

/**
 * ==========================================================================
 * EXECUÇÃO MANUAL RÁPIDA: CRIAÇÃO IMEDIATA DAS ABAS
 * Para criar as abas Atendentes, Assuntos_Servicos e Usuarios_Acesso agora mesmo:
 * 1. Selecione a função "setupInitialSheets" no menu superior do Apps Script.
 * 2. Clique no botão "Executar".
 * ==========================================================================
 */
function setupInitialSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureStructure(ss);
  Logger.log('Sucesso! As abas Respostas_Pesquisa, Metricas_Consolidadas, Atendentes, Assuntos_Servicos e Usuarios_Acesso foram criadas/atualizadas na planilha.');
}

/**
 * Função executada automaticamente ao receber requisições POST da Web App
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Bloqueio de concorrência por até 15 segundos
    lock.waitLock(15000);

    const contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      return jsonResponse({ status: 'error', message: 'Nenhum dado recebido no payload' }, 400);
    }

    const payload = JSON.parse(contents);

    // 1. Se for teste de conexão (ping)
    if (payload.action === 'ping') {
      return jsonResponse({ status: 'success', message: 'Conexão com Google Sheets ativa e operacional!' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureStructure(ss);

    // 2. Gravação de Atendentes / Servidores
    if (payload.action === 'saveAttendants') {
      const attendants = payload.data || payload.attendants || [];
      saveAttendantsToSheet(ss, attendants);
      return jsonResponse({
        status: 'success',
        message: 'Lista de atendentes atualizada com sucesso na planilha Google!',
        count: attendants.length,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Gravação de Assuntos Principais / Serviços
    if (payload.action === 'saveServices') {
      const services = payload.data || payload.services || [];
      saveServicesToSheet(ss, services);
      return jsonResponse({
        status: 'success',
        message: 'Lista de assuntos principais atualizada com sucesso na planilha Google!',
        count: services.length,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Gravação de ambos os cadastros simultaneamente (sync completo)
    if (payload.action === 'saveCadastros') {
      let attCount = 0;
      let srvCount = 0;
      if (payload.attendants && Array.isArray(payload.attendants)) {
        saveAttendantsToSheet(ss, payload.attendants);
        attCount = payload.attendants.length;
      }
      if (payload.services && Array.isArray(payload.services)) {
        saveServicesToSheet(ss, payload.services);
        srvCount = payload.services.length;
      }
      return jsonResponse({
        status: 'success',
        message: 'Cadastros operacionais sincronizados com sucesso na planilha Google!',
        attendantsCount: attCount,
        servicesCount: srvCount,
        timestamp: new Date().toISOString()
      });
    }

    // 5. Gravação de Usuários / Credenciais de Acesso (Exclusivo Administrador)
    if (payload.action === 'saveUsers') {
      const users = payload.data || payload.users || [];
      saveUsersToSheet(ss, users);
      return jsonResponse({
        status: 'success',
        message: 'Lista de usuários e credenciais atualizada com sucesso na planilha Google!',
        count: users.length,
        timestamp: new Date().toISOString()
      });
    }

    // 6. Registro de Avaliação de Satisfação (Totem / Mobile)
    const sheet = ss.getSheetByName(SHEETS.RESPONSES);

    // Preparação dos dados para gravação na linha
    const rowData = [
      payload.id || Utilities.getUuid(),
      payload.timestamp || new Date().toISOString(),
      payload.data || Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd'),
      payload.hora || Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'HH:mm:ss'),
      payload.atendente || payload.guiche || 'Não especificado',
      payload.tipo_servico || 'Não especificado',
      Number(payload.q1_csat) || 0,
      payload.q2_fcr || 'Não',
      Number(payload.q3_clareza) || 0,
      payload.q4_agilidade || 'Adequado',
      payload.q5_comentario || '',
      payload.sentimento || 'Neutro',
      payload.canal || 'Totem Presencial'
    ];

    sheet.appendRow(rowData);

    // Retorno amigável
    return jsonResponse({
      status: 'success',
      message: 'Avaliação registrada com sucesso na base da Procuradoria',
      protocol: payload.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({
      status: 'error',
      message: 'Erro interno ao processar requisição: ' + error.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Função executada ao receber requisições GET
 */
function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureStructure(ss);

    // 1. Consulta de Respostas de Avaliações
    if (action === 'getResponses') {
      const sheet = ss.getSheetByName(SHEETS.RESPONSES);
      const data = sheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return jsonResponse([]);
      }

      const records = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        records.push({
          id: row[0],
          timestamp: row[1],
          data: formatDateVal(row[2]),
          hora: formatTimeVal(row[3]),
          atendente: row[4],
          guiche: row[4], // retrocompatibilidade com versões anteriores
          tipo_servico: row[5],
          q1_csat: row[6],
          q2_fcr: row[7],
          q3_clareza: row[8],
          q4_agilidade: row[9],
          q5_comentario: row[10],
          sentimento: row[11],
          canal: row[12]
        });
      }

      // Ordena do mais recente para o mais antigo
      records.reverse();
      return jsonResponse(records);
    }

    // 2. Consulta de Atendentes / Servidores
    if (action === 'getAttendants') {
      const records = getAttendantsFromSheet(ss);
      return jsonResponse(records);
    }

    // 3. Consulta de Assuntos Principais / Serviços
    if (action === 'getServices') {
      const records = getServicesFromSheet(ss);
      return jsonResponse(records);
    }

    // 4. Consulta Unificada de Cadastros (Atendentes + Assuntos + Usuários)
    if (action === 'getCadastros') {
      const attendants = getAttendantsFromSheet(ss);
      const services = getServicesFromSheet(ss);
      const users = getUsersFromSheet(ss);
      return jsonResponse({
        attendants: attendants,
        services: services,
        users: users,
        timestamp: new Date().toISOString()
      });
    }

    // 5. Consulta Exclusiva de Usuários / Credenciais
    if (action === 'getUsers') {
      const records = getUsersFromSheet(ss);
      return jsonResponse(records);
    }

    // 6. Carga Total (Respostas + Cadastros + Usuários)
    if (action === 'getAllData') {
      const sheet = ss.getSheetByName(SHEETS.RESPONSES);
      const data = sheet.getDataRange().getValues();
      const records = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;
        records.push({
          id: row[0],
          timestamp: row[1],
          data: formatDateVal(row[2]),
          hora: formatTimeVal(row[3]),
          atendente: row[4],
          guiche: row[4],
          tipo_servico: row[5],
          q1_csat: row[6],
          q2_fcr: row[7],
          q3_clareza: row[8],
          q4_agilidade: row[9],
          q5_comentario: row[10],
          sentimento: row[11],
          canal: row[12]
        });
      }
      records.reverse();

      return jsonResponse({
        responses: records,
        attendants: getAttendantsFromSheet(ss),
        services: getServicesFromSheet(ss),
        users: getUsersFromSheet(ss),
        timestamp: new Date().toISOString()
      });
    }

    // Default: Status e Metadados da API
    return jsonResponse({
      status: 'online',
      system: 'Sistema de Satisfação do Cidadão - Dívida Ativa PGM São João de Meriti',
      version: '2.1.0',
      features: ['responses', 'metrics', 'attendants', 'services', 'users'],
      time: new Date().toISOString()
    });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Salva a lista de atendentes na aba 'Atendentes' (substitui dados, mantendo cabeçalho)
 */
function saveAttendantsToSheet(ss, attendants) {
  let sheet = ss.getSheetByName(SHEETS.ATTENDANTS);
  if (!sheet) {
    ensureStructure(ss);
    sheet = ss.getSheetByName(SHEETS.ATTENDANTS);
  }
  
  // Limpar linhas de dados anteriores
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

  if (Array.isArray(attendants) && attendants.length > 0) {
    const rows = attendants.map((a, idx) => [
      a.id || ('att-' + (Date.now() + idx)),
      a.name || '',
      a.role || '',
      a.active !== false,
      a.createdAt || new Date().toISOString()
    ]);
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }
}

/**
 * Salva a lista de serviços/assuntos na aba 'Assuntos_Servicos' (substitui dados, mantendo cabeçalho)
 */
function saveServicesToSheet(ss, services) {
  let sheet = ss.getSheetByName(SHEETS.SERVICES);
  if (!sheet) {
    ensureStructure(ss);
    sheet = ss.getSheetByName(SHEETS.SERVICES);
  }

  // Limpar linhas de dados anteriores
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

  if (Array.isArray(services) && services.length > 0) {
    const rows = services.map((s, idx) => [
      s.id || ('srv-' + (Date.now() + idx)),
      s.name || '',
      s.category || 'Atendimento Geral',
      s.active !== false,
      s.createdAt || new Date().toISOString()
    ]);
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }
}

/**
 * Lê atendentes da aba 'Atendentes'
 */
function getAttendantsFromSheet(ss) {
  const sheet = ss.getSheetByName(SHEETS.ATTENDANTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    records.push({
      id: String(row[0] || ('att-' + i)),
      name: String(row[1] || ''),
      role: String(row[2] || ''),
      active: row[3] === true || String(row[3]).toLowerCase() === 'true' || String(row[3]).toLowerCase() === 'sim',
      createdAt: formatDateVal(row[4]) || new Date().toISOString()
    });
  }
  return records;
}

/**
 * Lê assuntos da aba 'Assuntos_Servicos'
 */
function getServicesFromSheet(ss) {
  const sheet = ss.getSheetByName(SHEETS.SERVICES);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    records.push({
      id: String(row[0] || ('srv-' + i)),
      name: String(row[1] || ''),
      category: String(row[2] || 'Atendimento Geral'),
      active: row[3] === true || String(row[3]).toLowerCase() === 'true' || String(row[3]).toLowerCase() === 'sim',
      createdAt: formatDateVal(row[4]) || new Date().toISOString()
    });
  }
  return records;
}

/**
 * Criptografia SHA-256 de senhas para armazenamento seguro
 */
function hashPassword(str) {
  if (!str) return '';
  const clean = String(str).trim();
  // Se já for um hash hexadecimal de 64 caracteres, mantém
  if (/^[a-f0-9]{64}$/i.test(clean)) {
    return clean.toLowerCase();
  }
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, clean, Utilities.Charset.UTF_8);
  return signature.map(function(b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
  }).join('').toLowerCase();
}

/**
 * Salva a lista de usuários na aba 'Usuarios_Acesso' (substitui dados, mantendo cabeçalho e criptografia)
 */
function saveUsersToSheet(ss, users) {
  let sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) {
    ensureStructure(ss);
    sheet = ss.getSheetByName(SHEETS.USERS);
  }
  
  // Limpar linhas de dados anteriores
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  if (Array.isArray(users) && users.length > 0) {
    const rows = users.map(u => [
      u.username || '',
      hashPassword(u.password || ''),
      u.role || 'gestor',
      u.name || '',
      u.cargo || '',
      u.email || '',
      u.mustChangePassword === true || String(u.mustChangePassword).toLowerCase() === 'true',
      u.createdAt || new Date().toISOString()
    ]);
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
}

/**
 * Lê usuários da aba 'Usuarios_Acesso'
 */
function getUsersFromSheet(ss) {
  let sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) {
    ensureStructure(ss);
    sheet = ss.getSheetByName(SHEETS.USERS);
  }
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    // Se a aba estiver vazia (só cabeçalho), popula com os usuários padrão do sistema
    DEFAULT_USERS.forEach(row => sheet.appendRow(row));
    return getUsersFromSheet(ss);
  }

  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const pwd = String(row[1] || '').trim();
    records.push({
      username: String(row[0]).trim(),
      password: hashPassword(pwd), // Garante que retorne criptografado
      role: String(row[2] || 'gestor').trim().toLowerCase(),
      name: String(row[3] || ''),
      cargo: String(row[4] || ''),
      email: String(row[5] || ''),
      mustChangePassword: row[6] === true || String(row[6]).toLowerCase() === 'true' || String(row[6]).toLowerCase() === 'sim',
      createdAt: formatDateVal(row[7]) || new Date().toISOString()
    });
  }
  return records;
}

/**
 * Garante que todas as abas e cabeçalhos existam com formatação profissional
 */
function ensureStructure(ss) {
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  // 1. Aba de Respostas de Avaliações
  let responsesSheet = ss.getSheetByName(SHEETS.RESPONSES);
  if (!responsesSheet) {
    responsesSheet = ss.insertSheet(SHEETS.RESPONSES);
    const headers = [
      'Protocolo', 'Timestamp_ISO', 'Data', 'Hora', 'Nome_Atendente_Servidor',
      'Tipo_Servico', 'Q1_CSAT_Nota', 'Q2_FCR_Resolvido', 'Q3_Clareza_Nota',
      'Q4_Agilidade_Tempo', 'Q5_Comentario_Aberto', 'Sentimento_NLP', 'Canal_Origem'
    ];
    responsesSheet.appendRow(headers);

    const headerRange = responsesSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0a1f38')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setHorizontalAlignment('center');
    responsesSheet.setFrozenRows(1);
    responsesSheet.setColumnWidth(1, 180); // Protocolo
    responsesSheet.setColumnWidth(5, 220); // Nome do Atendente / Servidor
    responsesSheet.setColumnWidth(6, 220); // Servico
    responsesSheet.setColumnWidth(11, 300); // Comentário
  }

  // 2. Aba de Métricas Consolidadas (Fórmulas Automáticas de CX)
  let metricsSheet = ss.getSheetByName(SHEETS.METRICS);
  if (!metricsSheet) {
    metricsSheet = ss.insertSheet(SHEETS.METRICS);
    setupMetricsSheet(metricsSheet);
  }

  // 3. Aba de Atendentes / Servidores
  let attendantsSheet = ss.getSheetByName(SHEETS.ATTENDANTS);
  if (!attendantsSheet) {
    attendantsSheet = ss.insertSheet(SHEETS.ATTENDANTS);
    const headers = ['ID_Atendente', 'Nome_Atendente_Servidor', 'Especialidade_Guiche_Lotacao', 'Ativo_Totem', 'Data_Cadastro'];
    attendantsSheet.appendRow(headers);

    const headerRange = attendantsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0a1f38')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setHorizontalAlignment('center');
    attendantsSheet.setFrozenRows(1);
    attendantsSheet.setColumnWidth(1, 130);
    attendantsSheet.setColumnWidth(2, 240);
    attendantsSheet.setColumnWidth(3, 260);
    attendantsSheet.setColumnWidth(4, 120);
    attendantsSheet.setColumnWidth(5, 180);

    // Inserir atendentes padrão iniciais
    DEFAULT_ATTENDANTS.forEach(row => attendantsSheet.appendRow(row));
  }

  // 4. Aba de Assuntos Principais / Serviços da Dívida Ativa
  let servicesSheet = ss.getSheetByName(SHEETS.SERVICES);
  if (!servicesSheet) {
    servicesSheet = ss.insertSheet(SHEETS.SERVICES);
    const headers = ['ID_Assunto', 'Descricao_Assunto', 'Categoria_Ramo', 'Ativo_Totem', 'Data_Cadastro'];
    servicesSheet.appendRow(headers);

    const headerRange = servicesSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0a1f38')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setHorizontalAlignment('center');
    servicesSheet.setFrozenRows(1);
    servicesSheet.setColumnWidth(1, 130);
    servicesSheet.setColumnWidth(2, 280);
    servicesSheet.setColumnWidth(3, 220);
    servicesSheet.setColumnWidth(4, 120);
    servicesSheet.setColumnWidth(5, 180);

    // Inserir assuntos padrão iniciais
    DEFAULT_SERVICES.forEach(row => servicesSheet.appendRow(row));
  }

  // 5. Aba de Usuários e Credenciais de Acesso (Exclusivo Administrador)
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    const headers = ['Username', 'Password', 'Role', 'Nome_Completo', 'Cargo', 'Email', 'MustChangePassword', 'Data_Cadastro'];
    usersSheet.appendRow(headers);

    const headerRange = usersSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0a1f38')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontFamily('Arial')
      .setHorizontalAlignment('center');
    usersSheet.setFrozenRows(1);
    usersSheet.setColumnWidth(1, 140); // Username
    usersSheet.setColumnWidth(2, 140); // Password
    usersSheet.setColumnWidth(3, 100); // Role
    usersSheet.setColumnWidth(4, 240); // Nome_Completo
    usersSheet.setColumnWidth(5, 240); // Cargo
    usersSheet.setColumnWidth(6, 240); // Email
    usersSheet.setColumnWidth(7, 160); // MustChangePassword
    usersSheet.setColumnWidth(8, 180); // Data_Cadastro

    // Inserir usuários padrão iniciais
    DEFAULT_USERS.forEach(row => usersSheet.appendRow(row));
  } else if (usersSheet.getLastRow() <= 1) {
    // Se a aba já existe mas não possui linhas de dados, popula os padrões
    DEFAULT_USERS.forEach(row => usersSheet.appendRow(row));
  }
}

/**
 * Configura a aba de Métricas Consolidadas com fórmulas nativas do Sheets
 */
function setupMetricsSheet(sheet) {
  sheet.clear();

  const titleRange = sheet.getRange('A1:D1');
  titleRange.merge();
  titleRange.setValue('PGM SÃO JOÃO DE MERITI - INDICADORES ESTRATÉGICOS DE CX (DÍVIDA ATIVA)')
    .setBackground('#0a1f38')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(12)
    .setHorizontalAlignment('center');

  sheet.getRange('A3:D3').setValues([['Indicador', 'Fórmula / Métrica', 'Resultado Consolidado', 'Meta Institucional']])
    .setBackground('#134074')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  const rows = [
    ['Total de Avaliações', 'Contagem de Respostas', '=COUNTA(Respostas_Pesquisa!A2:A)', 'Volume Constante'],
    ['CSAT (% Aprovação Geral)', '% Notas 4 e 5 sobre total', '=COUNTIF(Respostas_Pesquisa!G2:G; ">=4")/MAX(1; COUNTA(Respostas_Pesquisa!A2:A))', '≥ 85%'],
    ['CSAT (Nota Média)', 'Média aritmética (1 a 5)', '=IFERROR(AVERAGE(Respostas_Pesquisa!G2:G); 0)', '≥ 4.2 / 5.0'],
    ['FCR (% Resolutividade 1º Contato)', '% Respostas "Sim, totalmente"', '=COUNTIF(Respostas_Pesquisa!H2:H; "Sim, totalmente")/MAX(1; COUNTA(Respostas_Pesquisa!A2:A))', '≥ 80%'],
    ['Clareza e Transparência Jurídica', 'Média de clareza das opções de acordo', '=IFERROR(AVERAGE(Respostas_Pesquisa!I2:I); 0)', '≥ 4.0 / 5.0'],
    ['Agilidade Percebida (Tempo Adequado/Rápido)', '% Cidadãos que acharam Rápido ou Adequado', '=(COUNTIF(Respostas_Pesquisa!J2:J; "Muito Rápido")+COUNTIF(Respostas_Pesquisa!J2:J; "Adequado"))/MAX(1; COUNTA(Respostas_Pesquisa!A2:A))', '≥ 75%']
  ];

  sheet.getRange(4, 1, rows.length, 4).setValues(rows);

  // Formata percentuais nas linhas 5, 7 e 9
  sheet.getRange('C5').setNumberFormat('0.0%');
  sheet.getRange('C6').setNumberFormat('0.00');
  sheet.getRange('C7').setNumberFormat('0.0%');
  sheet.getRange('C8').setNumberFormat('0.00');
  sheet.getRange('C9').setNumberFormat('0.0%');

  sheet.autoResizeColumns(1, 4);
}

/**
 * Função utilitária para resposta em JSON com CORS habilitado
 */
function jsonResponse(data, code) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDateVal(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'America/Sao_Paulo', 'yyyy-MM-dd');
  }
  return String(val);
}

function formatTimeVal(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'America/Sao_Paulo', 'HH:mm:ss');
  }
  return String(val);
}
