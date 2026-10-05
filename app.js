/**
 * ==========================================================================
 * SISTEMA DE SATISFAÇÃO DO CIDADÃO & MONITORAMENTO DE KPIS (CX)
 * Procuradoria Geral do Município de São João de Meriti - Dívida Ativa
 * Módulo de Lógica, Engenharia de Dados & CX Analytics (app.js)
 * ==========================================================================
 */

const App = (() => {

  // --- CONFIGURAÇÕES & ESTADO GLOBAL ---
  const STORAGE_KEYS = {
    CONFIG: 'SJM_CX_CONFIG_V1',
    RESPONSES: 'SJM_CX_RESPONSES_V1',
    THEME: 'SJM_CX_THEME_V1',
    AUTH: 'SJM_CX_AUTH_V1',
    USERS: 'SJM_CX_USERS_V1',
    ATTENDANTS: 'SJM_CX_ATTENDANTS_V1',
    SERVICES: 'SJM_CX_SERVICES_V1'
  };

  // Usuários e Credenciais Padrão (Administrador e Gestor com criptografia SHA-256)
  const DEFAULT_USERS = [
    {
      username: 'admin',
      password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // SHA-256 de admin123
      role: 'admin',
      name: 'Administrador PGM',
      cargo: 'Procurador / Administrador Geral',
      email: 'admin.pgm@sjm.rj.gov.br',
      mustChangePassword: false
    },
    {
      username: 'gestor',
      password: '18f2b94d784d03c222cb7c47148cdb8457f1ef3eaf3e317711f25d55747f6a35', // SHA-256 de gestor123
      role: 'gestor',
      name: 'Gestor Operacional',
      cargo: 'Supervisor de Atendimento ao Contribuinte',
      email: 'gestor.dividaativa@sjm.rj.gov.br',
      mustChangePassword: false
    }
  ];

  // URLs e Configurações Padrão
  const OFFICIAL_API_URL = 'https://script.google.com/macros/s/AKfycbzO5a_OG3POo6TChAmii8_I_vFj7sT296ly9-L0rqrFmeBsiqwnmr1KxPtq184GM1c/exec';

  const DEFAULT_CONFIG = {
    apiUrl: OFFICIAL_API_URL,
    goals: {
      csat: 85,      // Meta CSAT (% aprovação notas 4 e 5)
      fcr: 80,       // Meta FCR (% resolvido no 1º contato)
      clarity: 4.0,  // Meta Clareza (média 1 a 5)
      agility: 75    // Meta Agilidade (% rápido e adequado)
    }
  };

  let state = {
    config: { ...DEFAULT_CONFIG },
    responses: [],
    attendants: [],
    services: [],
    users: [],
    cadastrosSynced: false,
    usersSynced: false,
    currentView: 'totem', // 'totem' | 'dashboard' | 'relatorio' | 'config'
    currentUser: null,    // null = Cidadão (Acesso livre ao Totem), { username, role, name, cargo, email }
    pendingTargetView: null, // Redirecionamento após login bem-sucedido
    pendingFirstAccessUser: null, // Usuário em processo de troca obrigatória de senha
    isCitizenOnlyUrl: false, // Flag para modo exclusivo Cidadão (?perfil=cidadao)
    currentStep: 1,
    totalSteps: 5,
    surveyData: {
      q1_csat: null,
      q2_fcr: null,
      q3_clareza: null,
      q4_agilidade: null,
      q5_comentario: '',
      atendente: '',
      tipo_servico: ''
    },
    filters: {
      periodo: '7days',
      atendente: 'all',
      servico: 'all'
    },
    tableSearch: '',
    tablePage: 1,
    tablePageSize: 8,
    resetTimer: null,
    resetCountdown: 5
  };

  // --- DICIONÁRIO LÉXICO NLP PARA O SETOR PÚBLICO / TRIBUTÁRIO ---
  const NLP_LEXICON = {
    positive: [
      'atencioso', 'atenciosa', 'rápido', 'rapida', 'rapido', 'educado', 'educada', 'excelente', 
      'ótimo', 'otimo', 'ótima', 'otima', 'gentil', 'esclareceu', 'desconto', 'consegui', 'pagar', 
      'parcelar', 'acordo', 'eficiente', 'resolvido', 'maravilha', 'parabéns', 'parabens', 'obrigado', 
      'obrigada', 'prestativo', 'prestativa', 'humano', 'humana', 'agradável', 'agradavel', 
      'clareza', 'organizado', 'organizada', 'solucionou', 'ajudou', 'clareza', 'tranquilo', 'perfeito'
    ],
    negative: [
      'demora', 'demorado', 'demorada', 'fila', 'espera', 'sistema', 'lento', 'lenta', 'ar', 
      'fora', 'grosso', 'grossa', 'mal', 'ruim', 'confuso', 'confusa', 'caro', 'juros', 
      'desorganizado', 'desorganizada', 'péssimo', 'pessimo', 'péssima', 'pessima', 'horrível', 
      'horrivel', 'revoltante', 'falta', 'respeito', 'humilhação', 'humilhacao', 'descaso', 
      'abandonado', 'desinformado', 'burocracia', 'difícil', 'dificil', 'estragou', 'não'
    ],
    stopWords: new Set([
      'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 
      'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 
      'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 
      'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 
      'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 
      'estão', 'você', 'tinha', 'foram', 'essa', 'num', 'nem', 'suas', 'meu', 'às', 'minha', 
      'têm', 'numa', 'pelos', 'elas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'hoje'
    ])
  };

  // --- LIMPEZA DE DADOS LOCAIS (FORÇANDO 100% GOOGLE SHEETS) ---
  const purgeLocalCache = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.RESPONSES);
      localStorage.removeItem(STORAGE_KEYS.ATTENDANTS);
      localStorage.removeItem(STORAGE_KEYS.SERVICES);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.includes('RESPONSES') || k.includes('ATTENDANTS') || k.includes('SERVICES') || k.includes('MOCK'))) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {
      console.warn('Erro ao purgar dados locais residuais:', e);
    }
  };

  // --- INICIALIZAÇÃO DA APLICAÇÃO ---
  const init = () => {
    purgeLocalCache();
    loadSettings();
    applyStoredTheme();
    loadAuthSession();
    checkCitizenUrlMode();
    loadResponses();
    populateDropdowns();
    setupEventListeners();
    updateTotemStepUI();
    updateAuthUI();
    renderAttendantsTable();
    renderServicesTable();
    renderConfigUsersTable();
    renderConfigQRCode();
    renderDashboard();
    checkConnectionStatus();

    // Sincronização inicial automática e mandatória com a Planilha Google
    if (state.config.apiUrl) {
      loadDataFromSheets({ silent: true });
      loadCadastrosFromSheets({ silent: true });
      loadUsersFromSheets({ silent: true });
    }
    updateCadastrosCloudBadge('synced');
    updateUsersCloudBadge('synced');
  };

  // --- PERSISTÊNCIA & CONFIGURAÇÃO ---
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        state.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações:', e);
    }

    // Garante que a URL seja a oficial ativa da Planilha Google (substitui URLs legadas de teste)
    if (!state.config.apiUrl || state.config.apiUrl.includes('AKfycbw3eV5Z')) {
      state.config.apiUrl = OFFICIAL_API_URL;
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    }

    // Preenche campos da tela de config
    const apiUrlInput = document.getElementById('inputApiUrl');
    if (apiUrlInput) apiUrlInput.value = state.config.apiUrl || '';

    const metaCSAT = document.getElementById('metaCSAT');
    if (metaCSAT) metaCSAT.value = state.config.goals.csat;

    const metaFCR = document.getElementById('metaFCR');
    if (metaFCR) metaFCR.value = state.config.goals.fcr;

    const metaClarity = document.getElementById('metaClarity');
    if (metaClarity) metaClarity.value = state.config.goals.clarity;

    const metaAgility = document.getElementById('metaAgility');
    if (metaAgility) metaAgility.value = state.config.goals.agility;
  };

  const saveConfig = () => {
    const apiUrlInput = document.getElementById('inputApiUrl');
    state.config.apiUrl = apiUrlInput ? apiUrlInput.value.trim() : '';

    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    showToast('Configurações salvas com sucesso!', 'success');
    checkConnectionStatus();
    updateCadastrosCloudBadge('synced');
    updateUsersCloudBadge('synced');

    // Se informou a URL da planilha, já realiza a sincronização imediata
    if (state.config.apiUrl) {
      loadDataFromSheets();
      loadCadastrosFromSheets({ silent: true });
      loadUsersFromSheets({ silent: true });
    }
  };

  const saveGoals = () => {
    state.config.goals.csat = parseFloat(document.getElementById('metaCSAT').value) || 85;
    state.config.goals.fcr = parseFloat(document.getElementById('metaFCR').value) || 80;
    state.config.goals.clarity = parseFloat(document.getElementById('metaClarity').value) || 4.0;
    state.config.goals.agility = parseFloat(document.getElementById('metaAgility').value) || 75;

    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    showToast('Metas institucionais atualizadas!', 'success');
    renderDashboard();
  };

  const mapGuicheToAttendant = (guicheStr) => {
    if (!guicheStr) return 'Carlos Eduardo Ramos';
    if (guicheStr.includes('01')) return 'Carlos Eduardo Ramos';
    if (guicheStr.includes('02')) return 'Juliana Mendes';
    if (guicheStr.includes('03')) return 'Roberto Souza';
    if (guicheStr.includes('04')) return 'Ana Paula Silva';
    if (guicheStr.includes('05')) return 'Lucas Ferreira';
    if (guicheStr.includes('Triagem') || guicheStr.includes('Recepção')) return 'Mariana Costa';
    return guicheStr;
  };

  const loadResponses = () => {
    // Purga e zera array local. Todo o histórico vem obrigatoriamente da Planilha Google.
    state.responses = [];
  };

  const updateStorageCounters = () => {
    const counter = document.getElementById('localRecordsCount');
    if (counter) counter.innerText = state.responses.length;
  };

  // --- TEMA CLARO / ESCURO ---
  const applyStoredTheme = () => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'theme-light';
    const body = document.getElementById('appBody') || document.body;
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(savedTheme);
    updateThemeIcon(savedTheme);
  };

  const toggleTheme = () => {
    const body = document.getElementById('appBody') || document.body;
    const isDark = body.classList.contains('theme-dark');
    const newTheme = isDark ? 'theme-light' : 'theme-dark';
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    updateThemeIcon(newTheme);
  };

  const updateThemeIcon = (theme) => {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      const isDark = theme === 'theme-dark';
      btn.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i> <span class="theme-toggle-label">Modo Claro</span>' 
        : '<i class="fa-solid fa-moon" style="color: #ffffff;"></i> <span class="theme-toggle-label">Modo Escuro</span>';
      btn.setAttribute('title', isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro');
      btn.setAttribute('aria-label', isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro');
    }
  };

  // --- GESTÃO DE USUÁRIOS E AUTENTICAÇÃO (ADMINISTRADOR / GESTOR / CIDADÃO) ---
  // --- CRIPTOGRAFIA DE SENHAS (SHA-256 PADRÃO FIPS 180-4) ---
  const sha256 = (ascii) => {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';

    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;

    let hash = sha256.h = sha256.h || [];
    const k = sha256.k = sha256.k || [];
    let primeCounter = k[lengthProperty];

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    hash = hash.slice(0);

    for (i = 0; i < ascii[lengthProperty]; i++) {
      const charCode = ascii.charCodeAt(i);
      const wordIndex = i >> 2;
      words[wordIndex] = (words[wordIndex] || 0) | (charCode << ((3 - i % 4) * 8));
    }

    const bitIndex = asciiBitLength >> 5;
    words[bitIndex] = (words[bitIndex] || 0) | (0x80 << (24 - asciiBitLength % 32));

    const totalWords = (((asciiBitLength + 64) >> 9) << 4) + 16;
    while (words.length < totalWords) {
      words.push(0);
    }
    words[totalWords - 1] = asciiBitLength;

    for (j = 0; j < words[lengthProperty]; j += 16) {
      const w = words.slice(j, j + 16);
      const oldHash = hash.slice(0);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];

        const a = hash[0], e = hash[4];
        const temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? (w[i] || 0) : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (let byteIdx = 3; byteIdx >= 0; byteIdx--) {
        const b = (hash[i] >> (8 * byteIdx)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  };

  const hashPassword = (str) => {
    if (!str) return '';
    const clean = String(str).trim();
    if (/^[a-f0-9]{64}$/i.test(clean)) {
      return clean.toLowerCase();
    }
    return sha256(clean).toLowerCase();
  };

  const getUsersList = () => {
    if (state.users && state.users.length > 0) {
      return state.users;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.users = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar cache de usuarios:', e);
    }
    state.users = [...DEFAULT_USERS];
    return state.users;
  };

  const saveUsersList = (users, syncOnline = true) => {
    // Garante que toda senha esteja protegida por hash SHA-256 antes da persistência
    const sanitizedUsers = users.map(u => ({
      ...u,
      password: hashPassword(u.password)
    }));
    state.users = [...sanitizedUsers];
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitizedUsers));
    } catch (e) {
      console.warn('Erro ao salvar cache de usuarios:', e);
    }
    // Sincroniza imediatamente com a Planilha Google na nuvem (aba Usuarios_Acesso)
    if (syncOnline && state.config.apiUrl) {
      syncUsersToSheets(sanitizedUsers);
    }
  };

  // Sincronizacao online da lista de Usuarios com a Planilha Google
  const syncUsersToSheets = async (list) => {
    if (!state.config.apiUrl) return;
    try {
      updateUsersCloudBadge('saving');
      await fetch(state.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveUsers',
          data: list,
          timestamp: new Date().toISOString()
        }),
        mode: 'no-cors'
      });
      console.log('Usuarios gravados na Planilha Google com sucesso.');
      setTimeout(() => updateUsersCloudBadge('synced'), 700);
    } catch (err) {
      console.warn('Falha na sincronizacao online de usuarios:', err);
      updateUsersCloudBadge('offline');
    }
  };

  // Carga e leitura de Usuarios diretamente da Planilha Google (Aba Usuarios_Acesso)
  const loadUsersFromSheets = async (options = {}) => {
    const silent = options && options.silent === true;
    if (!state.config.apiUrl) {
      if (!silent) {
        showToast('Nenhuma URL do Google Sheets configurada. Acesse Configurações.', 'warning');
      }
      updateUsersCloudBadge('offline');
      return;
    }

    if (!silent) {
      showToast('Carregando contas de usuários da Planilha Google...', 'info');
    }

    try {
      updateUsersCloudBadge('loading');
      const response = await fetch(`${state.config.apiUrl}?action=getUsers`);
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result) && result.length > 0) {
          state.users = result;
          state.usersSynced = true;
          try {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(result));
          } catch (e) {}
          updateUsersCloudBadge('synced');
          renderConfigUsersTable();
          if (!silent) {
            showToast(`Usuários sincronizados da Planilha Google (${result.length} contas ativas)!`, 'success');
          }
          return;
        }

        // Se a Web App retornou versão anterior sem getUsers
        if (result && (result.version === '1.0.0' || result.version === '2.0.0')) {
          console.warn('Web App do Google Apps Script ainda em versão anterior sem getUsers.');
          updateUsersCloudBadge('warning');
          renderConfigUsersTable();
          if (!silent) {
            showToast('Atenção: A Web App do Google Apps Script precisa ser republicada como "Nova versão" para sincronizar a aba Usuarios_Acesso.', 'warning');
          }
          return;
        }
      }
      updateUsersCloudBadge('synced');
    } catch (err) {
      console.warn('Não foi possível carregar usuários do Google Sheets:', err);
      updateUsersCloudBadge('offline');
      if (!silent) {
        showToast('Não foi possível ler os usuários da Planilha Google. Verifique a conexão.', 'error');
      }
    }
  };

  // Atualiza o badge indicador de nuvem na tela de Gestão de Usuários
  const updateUsersCloudBadge = (status) => {
    const badge = document.getElementById('usersCloudBadge');
    if (!badge) return;

    if (!state.config.apiUrl) {
      badge.className = 'cadastros-cloud-badge badge-offline';
      badge.innerHTML = '<i class="fa-solid fa-cloud"></i> Planilha Desconectada';
      return;
    }

    if (status === 'saving' || status === 'loading') {
      badge.className = 'cadastros-cloud-badge badge-syncing';
      badge.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Sincronizando contas com Google Sheets...';
    } else if (status === 'synced') {
      badge.className = 'cadastros-cloud-badge badge-synced';
      badge.innerHTML = '<i class="fa-solid fa-cloud-check"></i> Credenciais Conectadas à Planilha Google (Aba "Usuarios_Acesso")';
    } else if (status === 'warning') {
      badge.className = 'cadastros-cloud-badge badge-error';
      badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Requer "Nova Versão" no Apps Script';
    } else if (status === 'error') {
      badge.className = 'cadastros-cloud-badge badge-error';
      badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Falha de Comunicação com a Planilha';
    } else {
      badge.className = 'cadastros-cloud-badge badge-offline';
      badge.innerHTML = '<i class="fa-solid fa-cloud"></i> Base Sincronizada';
    }
  };

  const loadAuthSession = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.username && user.role) {
          state.currentUser = user;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler sessão de autenticação:', e);
      state.currentUser = null;
    }
  };

  const saveAuthSession = (user) => {
    state.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
  };

  const clearAuthSession = () => {
    state.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  };

  const updateAuthUI = () => {
    const authContainer = document.getElementById('authStatusContainer');
    const navModes = document.getElementById('navModes');
    const btnTotem = document.getElementById('btnModeTotem');
    const btnDash = document.getElementById('btnModeDashboard');
    const btnRelat = document.getElementById('btnModeRelatorio');
    const btnCad = document.getElementById('btnModeCadastros');
    const btnConf = document.getElementById('btnModeConfig');
    const connBadge = document.getElementById('connectionBadge');

    const lockDash = document.getElementById('lockDashboard');
    const lockRelat = document.getElementById('lockRelatorio');
    const lockCad = document.getElementById('lockCadastros');
    const lockConf = document.getElementById('lockConfig');

    if (!authContainer) return;

    if (!state.currentUser) {
      // 1. PERFIL CIDADÃO / DESLOGADO (Modo Totem Público Limpo):
      // Oculta completamente o menu de navegação e o status de conexão com Google Sheets.
      // Permanece apenas o botão elegante "Acesso Restrito" para Gestores e Administradores.
      document.body.classList.remove('user-admin', 'user-gestor');
      document.body.classList.add('user-cidadao');

      if (navModes) navModes.style.display = 'none';
      if (connBadge) connBadge.style.display = 'none';

      if (btnDash) btnDash.style.display = 'none';
      if (btnRelat) btnRelat.style.display = 'none';
      if (btnCad) btnCad.style.display = 'none';
      if (btnConf) btnConf.style.display = 'none';

      authContainer.innerHTML = `
        <button type="button" class="btn-auth-login" onclick="App.openLoginModal()" title="Acessar Área Restrita (Gestor/Admin)">
          <i class="fa-solid fa-lock"></i>
          <span>Acesso Restrito</span>
        </button>
      `;

      if (lockDash) lockDash.classList.remove('unlocked');
      if (lockRelat) lockRelat.classList.remove('unlocked');
      if (lockCad) lockCad.classList.remove('unlocked');
      if (lockConf) lockConf.classList.remove('unlocked');
    } else {
      // 2. USUÁRIO AUTENTICADO: GESTOR OPERACIONAL OU ADMINISTRADOR
      const isAdm = state.currentUser.role === 'admin';
      const roleName = isAdm ? 'Administrador' : 'Gestor Operacional';
      const roleColor = isAdm ? '#38bdf8' : '#34d399';
      const avatarBg = isAdm ? 'var(--accent-cyan)' : 'var(--success)';
      const avatarInitial = (state.currentUser.name || state.currentUser.username || 'U').charAt(0).toUpperCase();

      document.body.classList.remove('user-cidadao');
      document.body.classList.add(isAdm ? 'user-admin' : 'user-gestor');

      // Reexibe a barra de navegação e o indicador de conexão com a planilha
      if (navModes) navModes.style.display = 'flex';
      if (connBadge) connBadge.style.display = 'flex';

      // Totem, Dashboard e Relatório ficam disponíveis para Gestor e Admin
      if (btnTotem) btnTotem.style.display = '';
      if (btnDash) btnDash.style.display = '';
      if (btnRelat) btnRelat.style.display = '';

      if (lockDash) lockDash.classList.add('unlocked');
      if (lockRelat) lockRelat.classList.add('unlocked');

      if (isAdm) {
        // Administrador: acesso pleno (Cadastros e Configurações liberados)
        if (btnCad) btnCad.style.display = '';
        if (btnConf) btnConf.style.display = '';
        if (lockCad) lockCad.classList.add('unlocked');
        if (lockConf) lockConf.classList.add('unlocked');
      } else {
        // Gestor Operacional: não visualiza Cadastros nem Configurações
        if (btnCad) btnCad.style.display = 'none';
        if (btnConf) btnConf.style.display = 'none';
        if (lockCad) lockCad.classList.remove('unlocked');
        if (lockConf) lockConf.classList.remove('unlocked');
      }

      authContainer.innerHTML = `
        <div class="auth-user-bar">
          <div class="user-logged-badge" onclick="App.confirmLogout()" title="Conectado como ${state.currentUser.name} (${roleName}) • Clique para sair">
            <div class="user-avatar-initial" style="background: ${avatarBg}; color: #0b1320;">${avatarInitial}</div>
            <div class="user-info-text">
              <span class="user-name-display">${state.currentUser.name || state.currentUser.username}</span>
              <span class="user-role-tag" style="color: ${roleColor};">${roleName}</span>
            </div>
          </div>
          <button type="button" class="btn-logout" id="btnLogoutHeader" onclick="App.logout()" title="Encerrar Sessão e Retornar ao Totem">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span class="btn-logout-label">Sair</span>
          </button>
        </div>
      `;
    }
  };

  const checkCitizenUrlMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('perfil') === 'cidadao') {
      state.isCitizenOnlyUrl = true;
      document.body.classList.add('mode-citizen-only');
    }
  };

  const openLoginModal = (targetView = null) => {
    state.pendingTargetView = targetView;
    if (state.config.apiUrl && !state.usersSynced) {
      loadUsersFromSheets({ silent: true });
    }
    const modal = document.getElementById('loginModal');
    const errBox = document.getElementById('loginErrorMsg');
    const userInp = document.getElementById('loginUsername');
    const passInp = document.getElementById('loginPassword');
    const noticeBox = document.getElementById('loginModalNotice');
    const noticeText = document.getElementById('loginModalNoticeText');

    if (errBox) errBox.style.display = 'none';
    if (passInp) passInp.value = '';

    const isAdminTarget = targetView === 'config' || targetView === 'cadastros';
    const isCurrentlyGestor = state.currentUser && state.currentUser.role !== 'admin';

    if (noticeBox && noticeText) {
      if (isAdminTarget) {
        noticeBox.style.background = 'rgba(56, 189, 248, 0.12)';
        noticeBox.style.borderColor = 'var(--accent-cyan)';
        const sectionName = targetView === 'config' ? 'Configurações do Sistema' : 'Cadastro de Atendentes e Assuntos';
        if (isCurrentlyGestor) {
          noticeText.innerHTML = `<strong>Acesso Exclusivo do Administrador:</strong> Você está conectado como <strong>Gestor (${state.currentUser.name})</strong>. A seção <em>${sectionName}</em> exige credenciais de Administrador. Autentique-se com <code>admin</code> / <code>admin123</code> para prosseguir.`;
        } else {
          noticeText.innerHTML = `<strong>Acesso Exclusivo do Administrador:</strong> A seção <em>${sectionName}</em> exige autenticação com perfil de Administrador (padrão: <code>admin</code> / <code>admin123</code>).`;
        }
      } else {
        noticeBox.style.background = '';
        noticeBox.style.borderColor = '';
        noticeText.innerHTML = `<strong>Atenção Munícipe:</strong> O Cidadão <u>não precisa</u> de usuário e senha. A avaliação no Totem é pública e livre.`;
      }
    }

    if (isAdminTarget && userInp) {
      userInp.value = 'admin';
    } else if (userInp && !userInp.value) {
      userInp.value = '';
    }

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => {
        if (isAdminTarget && passInp) {
          passInp.focus();
        } else if (userInp) {
          userInp.focus();
        }
      }, 150);
    }
  };

  const closeLoginModal = () => {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
    state.pendingTargetView = null;
    const noticeBox = document.getElementById('loginModalNotice');
    const noticeText = document.getElementById('loginModalNoticeText');
    if (noticeBox && noticeText) {
      noticeBox.style.background = '';
      noticeBox.style.borderColor = '';
      noticeText.innerHTML = `<strong>Atenção Munícipe:</strong> O Cidadão <u>não precisa</u> de usuário e senha. A avaliação no Totem é pública e livre.`;
    }
  };

  const handleLogin = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const usernameInp = document.getElementById('loginUsername');
    const passwordInp = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginErrorMsg');
    const errText = document.getElementById('loginErrorText');

    const username = usernameInp ? usernameInp.value.trim().toLowerCase() : '';
    const password = passwordInp ? passwordInp.value : '';
    const hashedAttempt = hashPassword(password);

    const users = getUsersList();
    // Autentica via hash criptográfico SHA-256 (com suporte transparente e upgrade automático para senhas legadas)
    const userFound = users.find(u => {
      if (u.username.toLowerCase() !== username) return false;
      const stored = String(u.password || '').trim();
      return stored === hashedAttempt || stored === password;
    });

    if (userFound) {
      // Se a senha armazenada ainda estava em texto claro, migra imediatamente para o hash seguro
      if (userFound.password !== hashedAttempt) {
        userFound.password = hashedAttempt;
        saveUsersList(users);
      }

      if (errBox) errBox.style.display = 'none';

      // Interceptação obrigatória: primeiro acesso com troca de senha pendente
      if (userFound.mustChangePassword) {
        state.pendingFirstAccessUser = userFound;
        closeLoginModal();
        openFirstAccessModal(userFound);
        return;
      }

      saveAuthSession({
        username: userFound.username,
        role: userFound.role,
        name: userFound.name,
        cargo: userFound.cargo,
        email: userFound.email
      });

      updateAuthUI();
      renderConfigUsersTable();
      closeLoginModal();

      const profileLabel = userFound.role === 'admin' ? 'Administrador' : 'Gestor';
      showToast(`Bem-vindo, ${userFound.name}! Perfil: ${profileLabel}.`, 'success');

      if (state.pendingTargetView) {
        const dest = state.pendingTargetView;
        state.pendingTargetView = null;
        switchView(dest);
      } else {
        // Redireciona para o Painel de KPIs ao entrar pela Área Restrita
        switchView('dashboard');
      }
    } else {
      if (errBox) errBox.style.display = 'flex';
      if (errText) errText.innerText = 'Usuário ou senha incorretos. Verifique suas credenciais.';
      if (passwordInp) passwordInp.select();
    }
  };

  const openFirstAccessModal = (user) => {
    const modal = document.getElementById('firstAccessModal');
    const nameEl = document.getElementById('firstAccessUserName');
    const loginEl = document.getElementById('firstAccessUserLogin');
    const roleEl = document.getElementById('firstAccessUserRole');
    const newPwd = document.getElementById('firstAccessNewPassword');
    const confPwd = document.getElementById('firstAccessConfirmPassword');
    const errBox = document.getElementById('firstAccessErrorMsg');

    if (nameEl) nameEl.innerText = user.name;
    if (loginEl) loginEl.innerText = user.username;
    if (roleEl) {
      const isAdm = user.role === 'admin';
      roleEl.className = isAdm ? 'role-badge badge-admin' : 'role-badge badge-gestor';
      roleEl.innerHTML = isAdm ? '<i class="fa-solid fa-crown"></i> Administrador' : '<i class="fa-solid fa-briefcase"></i> Gestor';
    }

    if (newPwd) newPwd.value = '';
    if (confPwd) confPwd.value = '';
    if (errBox) errBox.style.display = 'none';

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => newPwd && newPwd.focus(), 150);
    }
  };

  const closeFirstAccessModal = () => {
    const modal = document.getElementById('firstAccessModal');
    if (modal) modal.classList.remove('active');
    state.pendingFirstAccessUser = null;
  };

  const cancelFirstAccess = () => {
    closeFirstAccessModal();
    showToast('Acesso cancelado. A alteração da senha inicial é obrigatória para acessar o sistema.', 'warning');
  };

  const submitFirstAccessPassword = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!state.pendingFirstAccessUser) {
      showToast('Sessão de troca de senha expirada. Por favor, tente fazer login novamente.', 'error');
      closeFirstAccessModal();
      return;
    }

    const newPwdInp = document.getElementById('firstAccessNewPassword');
    const confPwdInp = document.getElementById('firstAccessConfirmPassword');
    const errBox = document.getElementById('firstAccessErrorMsg');
    const errText = document.getElementById('firstAccessErrorText');

    const newPwd = newPwdInp ? newPwdInp.value : '';
    const confPwd = confPwdInp ? confPwdInp.value : '';

    if (!newPwd || newPwd.length < 4) {
      if (errBox) errBox.style.display = 'flex';
      if (errText) errText.innerText = 'A nova senha deve possuir ao menos 4 caracteres.';
      newPwdInp?.focus();
      return;
    }

    if (newPwd !== confPwd) {
      if (errBox) errBox.style.display = 'flex';
      if (errText) errText.innerText = 'A confirmação não coincide com a nova senha digitada.';
      confPwdInp?.focus();
      return;
    }

    const targetUsername = state.pendingFirstAccessUser.username.toLowerCase();
    const users = getUsersList();
    const idx = users.findIndex(u => u.username.toLowerCase() === targetUsername);

    if (idx !== -1) {
      const hashedNew = hashPassword(newPwd);
      if (users[idx].password === hashedNew || users[idx].password === newPwd) {
        if (errBox) errBox.style.display = 'flex';
        if (errText) errText.innerText = 'A nova senha deve ser diferente da senha provisória anterior.';
        newPwdInp?.focus();
        return;
      }

      users[idx].password = hashedNew;
      users[idx].mustChangePassword = false;
      users[idx].passwordChangedAt = new Date().toISOString();
      saveUsersList(users);

      const updatedUser = {
        username: users[idx].username,
        role: users[idx].role,
        name: users[idx].name,
        cargo: users[idx].cargo,
        email: users[idx].email
      };

      saveAuthSession(updatedUser);
      updateAuthUI();
      renderConfigUsersTable();
      closeFirstAccessModal();

      const profileLabel = updatedUser.role === 'admin' ? 'Administrador' : 'Gestor';
      showToast(`Senha alterada com sucesso! Bem-vindo(a), ${updatedUser.name} (${profileLabel}).`, 'success');

      if (state.pendingTargetView) {
        const dest = state.pendingTargetView;
        state.pendingTargetView = null;
        switchView(dest);
      } else {
        switchView('dashboard');
      }
    } else {
      showToast('Usuário não localizado no sistema.', 'error');
      closeFirstAccessModal();
    }
  };

  const logout = () => {
    clearAuthSession();
    updateAuthUI();
    showToast('Sessão encerrada com sucesso.', 'info');
    if (state.currentView !== 'totem') {
      switchView('totem');
    }
  };

  const confirmLogout = () => {
    if (confirm('Deseja realmente encerrar a sessão e retornar ao Totem do Cidadão?')) {
      logout();
    }
  };

  const fillDemoLogin = (user, pass) => {
    const usernameInp = document.getElementById('loginUsername');
    const passwordInp = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginErrorMsg');

    if (usernameInp) usernameInp.value = user;
    if (passwordInp) passwordInp.value = pass;
    if (errBox) errBox.style.display = 'none';
    if (passwordInp) passwordInp.focus();
  };

  const togglePasswordVisibility = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (btn) {
      btn.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    }
  };

  const renderConfigUsersTable = () => {
    const tbody = document.getElementById('configUsersTableBody');
    if (!tbody) return;

    const users = getUsersList();
    const rowsHtml = users.map(u => {
      const isAdm = u.role === 'admin';
      const badgeClass = isAdm ? 'role-badge badge-admin' : 'role-badge badge-gestor';
      const roleText = isAdm ? '<i class="fa-solid fa-crown"></i> Administrador' : '<i class="fa-solid fa-briefcase"></i> Gestor';
      const accessDesc = isAdm 
        ? 'Acesso total (Totem, KPIs, Relatórios, Cadastros e Configurações)' 
        : 'Acesso operacional (Totem, KPIs e Relatórios Executivos)';

      const isCurrent = state.currentUser && state.currentUser.username.toLowerCase() === u.username.toLowerCase();
      const isRootDefault = u.username.toLowerCase() === 'admin' && users.filter(x => x.role === 'admin').length <= 1;

      let actionHtml = '';
      if (isCurrent) {
        actionHtml = '<span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 600;"><i class="fa-solid fa-user-check"></i> Sessão Atual</span>';
      } else if (isRootDefault) {
        actionHtml = '<span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;"><i class="fa-solid fa-shield"></i> Padrão Raiz</span>';
      } else {
        actionHtml = `
          <button type="button" class="btn-outline-danger btn-sm" onclick="App.deleteUser('${u.username}')" title="Excluir Usuário ${u.name}">
            <i class="fa-solid fa-trash-can"></i> Excluir
          </button>
        `;
      }

      let statusHtml = '';
      if (u.mustChangePassword) {
        statusHtml = '<span class="role-badge badge-pending-pwd" title="O servidor deverá alterar a senha no primeiro/próximo acesso"><i class="fa-solid fa-clock-rotate-left"></i> Troca Pendente</span> <span style="display: block; margin-top: 4px; font-size: 0.72rem; color: var(--accent-cyan); font-weight: 600;"><i class="fa-solid fa-shield-halved"></i> SHA-256</span>';
      } else {
        statusHtml = '<span style="color: var(--success); font-weight: 700; font-size: 0.78rem;"><i class="fa-solid fa-circle-check"></i> Ativo / Regular</span> <span style="display: block; margin-top: 4px; font-size: 0.72rem; color: var(--accent-cyan); font-weight: 600;"><i class="fa-solid fa-shield-halved"></i> SHA-256</span>';
      }

      return `
        <tr>
          <td><span class="${badgeClass}">${roleText}</span></td>
          <td><strong>${u.username}</strong></td>
          <td>${u.name} <br><small style="color: var(--text-muted);">${u.cargo || ''}</small></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${accessDesc}</td>
          <td>${statusHtml}</td>
          <td style="text-align: center;">${actionHtml}</td>
        </tr>
      `;
    }).join('');

    const citizenRow = `
      <tr class="citizen-row">
        <td><span class="role-badge badge-citizen"><i class="fa-solid fa-person-shelter"></i> Cidadão</span></td>
        <td><em>Público</em></td>
        <td>Contribuinte / Munícipe de São João de Meriti</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">Acesso exclusivo ao Totem de Pesquisa (Físico ou via QR Code)</td>
        <td><span class="no-pwd-tag"><i class="fa-solid fa-unlock"></i> Livre / Sem Senha</span></td>
        <td style="text-align: center;"><span style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">Livre</span></td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml + citizenRow;

    const select = document.getElementById('selectUserChangePwd');
    if (select) {
      select.innerHTML = users.map(u => `
        <option value="${u.username}">${u.name} (${u.username} - ${u.role === 'admin' ? 'Administrador' : 'Gestor'})</option>
      `).join('');
    }
  };

  const registerNewUser = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o perfil Administrador pode cadastrar novos usuários.', 'error');
      return;
    }

    const nameInp = document.getElementById('newUserName');
    const usernameInp = document.getElementById('newUserUsername');
    const roleInp = document.getElementById('newUserRole');
    const cargoInp = document.getElementById('newUserCargo');
    const passwordInp = document.getElementById('newUserPassword');
    const mustChangeInp = document.getElementById('newUserMustChangePassword');

    const name = nameInp ? nameInp.value.trim() : '';
    const rawUsername = usernameInp ? usernameInp.value.trim().toLowerCase() : '';
    const role = roleInp ? roleInp.value : 'gestor';
    const cargo = cargoInp ? cargoInp.value.trim() : 'Servidor Público';
    const password = passwordInp ? passwordInp.value : '';
    const mustChange = mustChangeInp ? mustChangeInp.checked : true;

    if (!name || name.length < 3) {
      showToast('Por favor, informe o nome completo do servidor.', 'warning');
      nameInp?.focus();
      return;
    }

    if (!rawUsername || rawUsername.length < 3) {
      showToast('O nome de usuário deve ter no mínimo 3 caracteres.', 'warning');
      usernameInp?.focus();
      return;
    }

    // Normaliza username para evitar espaços
    const username = rawUsername.replace(/\s+/g, '.');

    if (!password || password.length < 4) {
      showToast('A senha inicial deve ter pelo menos 4 caracteres.', 'warning');
      passwordInp?.focus();
      return;
    }

    const users = getUsersList();
    const exists = users.some(u => u.username.toLowerCase() === username);

    if (exists) {
      showToast(`O usuário '${username}' já está cadastrado. Escolha outro nome de login.`, 'error');
      usernameInp?.focus();
      return;
    }

    const newUser = {
      username: username,
      password: hashPassword(password),
      role: role,
      name: name,
      cargo: cargo,
      email: `${username}@sjm.rj.gov.br`,
      mustChangePassword: mustChange,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsersList(users);

    // Limpa formulário
    if (nameInp) nameInp.value = '';
    if (usernameInp) usernameInp.value = '';
    if (cargoInp) cargoInp.value = '';
    if (passwordInp) passwordInp.value = '';
    if (mustChangeInp) mustChangeInp.checked = true;

    const roleLabel = role === 'admin' ? 'Administrador' : 'Gestor';
    const firstAccessNotice = mustChange ? ' (Troca obrigatória no primeiro login ativa)' : '';
    showToast(`Usuário '${username}' (${roleLabel}) cadastrado com sucesso (senha protegida em SHA-256)!${firstAccessNotice}`, 'success');

    renderConfigUsersTable();
  };

  const deleteUser = (usernameToDelete) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode excluir usuários.', 'error');
      return;
    }

    if (state.currentUser.username.toLowerCase() === usernameToDelete.toLowerCase()) {
      showToast('Não é permitido excluir a própria conta em uso.', 'warning');
      return;
    }

    const users = getUsersList();
    const target = users.find(u => u.username.toLowerCase() === usernameToDelete.toLowerCase());

    if (!target) {
      showToast('Usuário não encontrado.', 'error');
      return;
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    if (target.role === 'admin' && adminCount <= 1) {
      showToast('Não é possível excluir o único Administrador do sistema.', 'error');
      return;
    }

    if (!confirm(`Confirma a exclusão do usuário '${target.name}' (${target.username})?`)) {
      return;
    }

    const updatedUsers = users.filter(u => u.username.toLowerCase() !== usernameToDelete.toLowerCase());
    saveUsersList(updatedUsers);

    showToast(`Usuário '${usernameToDelete}' excluído com sucesso.`, 'info');
    renderConfigUsersTable();
  };

  const changeUserPassword = () => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o perfil Administrador pode redefinir senhas do sistema.', 'error');
      return;
    }

    const select = document.getElementById('selectUserChangePwd');
    const inputPwd = document.getElementById('inputNewPassword');
    const resetMustChangeInp = document.getElementById('resetMustChangePassword');

    const targetUser = select ? select.value : '';
    const newPwd = inputPwd ? inputPwd.value.trim() : '';
    const mustChange = resetMustChangeInp ? resetMustChangeInp.checked : true;

    if (!newPwd || newPwd.length < 4) {
      showToast('A nova senha deve possuir ao menos 4 caracteres.', 'warning');
      return;
    }

    const users = getUsersList();
    const idx = users.findIndex(u => u.username === targetUser);

    if (idx !== -1) {
      users[idx].password = hashPassword(newPwd);
      users[idx].mustChangePassword = mustChange;
      saveUsersList(users);
      if (inputPwd) inputPwd.value = '';
      const notice = mustChange ? ' Troca exigida no próximo acesso.' : '';
      showToast(`Senha do usuário '${targetUser}' atualizada com sucesso (criptografada em SHA-256)!${notice}`, 'success');
      renderConfigUsersTable();
    } else {
      showToast('Usuário não encontrado.', 'error');
    }
  };

  // --- GESTÃO OPERACIONAL DE ATENDENTES E ASSUNTOS (INTEGRAÇÃO DIRETA COM A PLANILHA GOOGLE) ---
  const getAttendantsList = () => {
    // Retorna exclusivamente a lista mantida em memória sincronizada com a Planilha Google (SEM dados locais/falsos)
    return state.attendants || [];
  };

  const saveAttendantsList = (list, syncOnline = true) => {
    state.attendants = [...list];
    // Transmite diretamente para a Planilha Google (aba 'Atendentes')
    if (syncOnline && state.config.apiUrl) {
      syncAttendantsToSheets(list);
    }
  };

  const getServicesList = () => {
    // Retorna exclusivamente a lista mantida em memória sincronizada com a Planilha Google (SEM dados locais/falsos)
    return state.services || [];
  };

  const saveServicesList = (list, syncOnline = true) => {
    state.services = [...list];
    // Transmite diretamente para a Planilha Google (aba 'Assuntos_Servicos')
    if (syncOnline && state.config.apiUrl) {
      syncServicesToSheets(list);
    }
  };

  // Sincronização individual da lista de Atendentes com a aba 'Atendentes' da Planilha Google
  const syncAttendantsToSheets = async (list) => {
    if (!state.config.apiUrl) return;
    try {
      updateCadastrosCloudBadge('saving');
      await fetch(state.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAttendants',
          data: list,
          timestamp: new Date().toISOString()
        }),
        mode: 'no-cors'
      });
      console.log('Atendentes gravados na Planilha Google com sucesso.');
      setTimeout(() => updateCadastrosCloudBadge('synced'), 700);
    } catch (err) {
      console.warn('Falha na sincronização online de atendentes:', err);
      updateCadastrosCloudBadge('offline');
    }
  };

  // Sincronização individual da lista de Serviços com a aba 'Assuntos_Servicos' da Planilha Google
  const syncServicesToSheets = async (list) => {
    if (!state.config.apiUrl) return;
    try {
      updateCadastrosCloudBadge('saving');
      await fetch(state.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveServices',
          data: list,
          timestamp: new Date().toISOString()
        }),
        mode: 'no-cors'
      });
      console.log('Assuntos gravados na Planilha Google com sucesso.');
      setTimeout(() => updateCadastrosCloudBadge('synced'), 700);
    } catch (err) {
      console.warn('Falha na sincronização online de assuntos:', err);
      updateCadastrosCloudBadge('offline');
    }
  };

  // Envio em lote dos cadastros para a Planilha Google
  const sendCadastrosToSheets = async (options = {}) => {
    const silent = options && options.silent === true;
    if (!state.config.apiUrl) {
      if (!silent) {
        showToast('Nenhuma URL da Planilha Google configurada. Acesse Configurações.', 'warning');
      }
      updateCadastrosCloudBadge('offline');
      return;
    }

    if (!silent) {
      showToast('Enviando atendentes e assuntos para a Planilha Google...', 'info');
    }

    try {
      updateCadastrosCloudBadge('saving');
      const attendants = getAttendantsList();
      const services = getServicesList();

      await fetch(state.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveCadastros',
          attendants: attendants,
          services: services,
          timestamp: new Date().toISOString()
        }),
        mode: 'no-cors'
      });

      state.cadastrosSynced = true;
      setTimeout(() => updateCadastrosCloudBadge('synced'), 700);
      if (!silent) {
        showToast(`Cadastros sincronizados com sucesso na Planilha Google! (${attendants.length} atendentes e ${services.length} assuntos)`, 'success');
      }
    } catch (err) {
      console.warn('Erro ao enviar cadastros para a planilha Google:', err);
      updateCadastrosCloudBadge('error');
      if (!silent) {
        showToast('Erro ao sincronizar cadastros com a planilha Google.', 'error');
      }
    }
  };

  // Carga e leitura de Atendentes e Assuntos diretamente da Planilha Google
  const loadCadastrosFromSheets = async (options = {}) => {
    const silent = options && options.silent === true;
    if (!state.config.apiUrl) {
      if (!silent) {
        showToast('Nenhuma URL do Google Sheets configurada. Acesse Configurações para vincular a planilha.', 'warning');
      }
      updateCadastrosCloudBadge('offline');
      return;
    }

    if (!silent) {
      showToast('Carregando atendentes e assuntos da Planilha Google...', 'info');
    }

    try {
      updateCadastrosCloudBadge('loading');
      const response = await fetch(`${state.config.apiUrl}?action=getCadastros`);
      if (response.ok) {
        const result = await response.json();
        let loaded = false;

        // Se retornou atendentes da aba dedicada da planilha
        if (result && Array.isArray(result.attendants)) {
          state.attendants = result.attendants;
          loaded = true;
        }

        // Se retornou assuntos da aba dedicada da planilha
        if (result && Array.isArray(result.services)) {
          state.services = result.services;
          loaded = true;
        }

        // Se retornou usuários da aba dedicada da planilha
        if (result && Array.isArray(result.users) && result.users.length > 0) {
          state.users = result.users;
          state.usersSynced = true;
          try {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(result.users));
          } catch (e) {}
          updateUsersCloudBadge('synced');
          renderConfigUsersTable();
        }

        if (loaded) {
          state.cadastrosSynced = true;
          updateCadastrosCloudBadge('synced');
          renderAttendantsTable();
          renderServicesTable();
          populateDropdowns();
          if (!silent) {
            showToast(`Cadastros sincronizados da Planilha Google! (${state.attendants.length} atendentes e ${state.services.length} assuntos)`, 'success');
          }
          return;
        }

        // Se a Web App retornou version 1.0.0 (implantação antiga no Apps Script sem a ação getCadastros)
        if (result && result.version === '1.0.0') {
          console.warn('Web App do Google Apps Script ainda na versão 1.0.0. É necessário criar uma Nova Versão em Gerenciar Implantações.');
          updateCadastrosCloudBadge('warning');
          renderAttendantsTable();
          renderServicesTable();
          if (!silent) {
            showToast('Atenção: A Web App do Google Apps Script precisa ser republicada como "Nova versão" para liberar a leitura das abas Atendentes e Assuntos_Servicos.', 'warning');
          }
          return;
        }
      }
      updateCadastrosCloudBadge('synced');
    } catch (err) {
      console.warn('Não foi possível carregar cadastros do Google Sheets:', err);
      updateCadastrosCloudBadge('offline');
      if (!silent) {
        showToast('Não foi possível ler os cadastros da planilha Google. Verifique a conexão.', 'error');
      }
    }
  };

  // Atualiza o badge indicador de nuvem na tela de Cadastros
  const updateCadastrosCloudBadge = (status) => {
    const badge = document.getElementById('cadastrosCloudBadge');
    if (!badge) return;

    if (!state.config.apiUrl) {
      badge.className = 'cadastros-cloud-badge badge-offline';
      badge.innerHTML = '<i class="fa-solid fa-cloud"></i> Planilha Desconectada';
      return;
    }

    if (status === 'saving' || status === 'loading') {
      badge.className = 'cadastros-cloud-badge badge-syncing';
      badge.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Sincronizando com Google Sheets...';
    } else if (status === 'synced') {
      badge.className = 'cadastros-cloud-badge badge-synced';
      badge.innerHTML = '<i class="fa-solid fa-cloud-check"></i> Planilha Google Conectada (Abas "Atendentes" & "Assuntos_Servicos")';
    } else if (status === 'warning') {
      badge.className = 'cadastros-cloud-badge badge-error';
      badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Requer "Nova Versão" no Apps Script';
    } else if (status === 'error') {
      badge.className = 'cadastros-cloud-badge badge-error';
      badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Falha de Comunicação com a Planilha';
    } else {
      badge.className = 'cadastros-cloud-badge badge-offline';
      badge.innerHTML = '<i class="fa-solid fa-cloud"></i> Base Sincronizada';
    }
  };

  const populateDropdowns = () => {
    const attendants = getAttendantsList();
    const services = getServicesList();

    // 1. Totem Atendente (#selectAtendente) - exibe apenas atendentes ativos e inicia vazio
    const selAtendente = document.getElementById('selectAtendente');
    if (selAtendente) {
      const prevVal = selAtendente.value;
      const activeAttendants = attendants.filter(a => a.active);
      const listToRender = activeAttendants.length > 0 ? activeAttendants : attendants;
      
      if (listToRender.length === 0) {
        selAtendente.innerHTML = '<option value="" disabled selected>-- Aguardando leitura da Planilha Google... --</option>';
      } else {
        selAtendente.innerHTML = `
          <option value="" disabled ${!prevVal ? 'selected' : ''}>-- Selecione o Atendente / Servidor --</option>
          ${listToRender.map(a => `
            <option value="${a.name}">${a.name} ${a.role ? '(' + a.role + ')' : ''}</option>
          `).join('')}
        `;
      }

      if (prevVal && listToRender.some(a => a.name === prevVal)) {
        selAtendente.value = prevVal;
      } else {
        selAtendente.value = '';
      }
      state.surveyData.atendente = selAtendente.value;
    }

    // 2. Totem Assunto Principal (#selectTipoServico) - exibe apenas serviços ativos e inicia vazio
    const selServico = document.getElementById('selectTipoServico');
    if (selServico) {
      const prevVal = selServico.value;
      const activeServices = services.filter(s => s.active);
      const listToRender = activeServices.length > 0 ? activeServices : services;

      if (listToRender.length === 0) {
        selServico.innerHTML = '<option value="" disabled selected>-- Aguardando leitura da Planilha Google... --</option>';
      } else {
        selServico.innerHTML = `
          <option value="" disabled ${!prevVal ? 'selected' : ''}>-- Selecione o Assunto Principal --</option>
          ${listToRender.map(s => `
            <option value="${s.name}">${s.name}</option>
          `).join('')}
        `;
      }

      if (prevVal && listToRender.some(s => s.name === prevVal)) {
        selServico.value = prevVal;
      } else {
        selServico.value = '';
      }
      state.surveyData.tipo_servico = selServico.value;
    }

    // 3. Filtro de Atendente no Dashboard (#filterAtendente) - exibe todos para histórico
    const filterAte = document.getElementById('filterAtendente');
    if (filterAte) {
      const prevVal = filterAte.value;
      filterAte.innerHTML = `
        <option value="all">Todos os Servidores</option>
        ${attendants.map(a => `<option value="${a.name}">${a.name} ${!a.active ? '(Inativo)' : ''}</option>`).join('')}
      `;
      if (prevVal && (prevVal === 'all' || attendants.some(a => a.name === prevVal))) {
        filterAte.value = prevVal;
      } else {
        filterAte.value = 'all';
      }
      state.filters.atendente = filterAte.value;
    }

    // 4. Filtro de Assunto no Dashboard (#filterServico) - exibe todos para histórico
    const filterSer = document.getElementById('filterServico');
    if (filterSer) {
      const prevVal = filterSer.value;
      filterSer.innerHTML = `
        <option value="all">Todos os Assuntos</option>
        ${services.map(s => `<option value="${s.name}">${s.name} ${!s.active ? '(Inativo)' : ''}</option>`).join('')}
      `;
      if (prevVal && (prevVal === 'all' || services.some(s => s.name === prevVal))) {
        filterSer.value = prevVal;
      } else {
        filterSer.value = 'all';
      }
      state.filters.servico = filterSer.value;
    }
  };

  const renderAttendantsTable = () => {
    const tbody = document.getElementById('attendantsTableBody');
    const countEl = document.getElementById('countActiveAttendants');
    if (!tbody) return;

    const attendants = getAttendantsList();
    const activeCount = attendants.filter(a => a.active).length;
    if (countEl) countEl.innerText = activeCount;

    if (attendants.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
            <i class="fa-solid fa-arrows-rotate fa-spin" style="margin-right: 8px; color: var(--accent-cyan);"></i>
            Sincronizando atendentes da Planilha Google... Cadastre novos atendentes no formulário acima ou clique em "Sincronizar da Planilha".
          </td>
        </tr>
      `;
      return;
    }

    // Mapa de contagem de avaliações por atendente
    const evalCounts = {};
    state.responses.forEach(r => {
      const name = r.atendente || r.guiche || '';
      evalCounts[name] = (evalCounts[name] || 0) + 1;
    });

    tbody.innerHTML = attendants.map(a => {
      const count = evalCounts[a.name] || 0;
      const statusBadge = a.active 
        ? '<span class="status-badge-active"><i class="fa-solid fa-circle-check"></i> Ativo no Totem</span>'
        : '<span class="status-badge-inactive"><i class="fa-solid fa-circle-xmark"></i> Inativo / Oculto</span>';

      const toggleIcon = a.active ? '<i class="fa-solid fa-eye-slash"></i> Desativar' : '<i class="fa-solid fa-eye"></i> Ativar';
      const toggleTitle = a.active ? 'Ocultar atendente do Totem Cidadão' : 'Ativar atendente para avaliações no Totem';

      return `
        <tr>
          <td>
            <strong><i class="fa-solid fa-user-tie" style="color: var(--accent-cyan); margin-right: 6px;"></i>${a.name}</strong>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${a.role}</td>
          <td>${statusBadge}</td>
          <td style="text-align: center;">
            <span class="eval-count-tag"><strong>${count}</strong> ${count === 1 ? 'avaliação' : 'avaliações'}</span>
          </td>
          <td style="text-align: center;">
            <div style="display: inline-flex; gap: 6px;">
              <button type="button" class="btn-action-toggle" onclick="App.toggleAttendantStatus('${a.id}')" title="${toggleTitle}">
                ${toggleIcon}
              </button>
              <button type="button" class="btn-outline-danger btn-sm" onclick="App.deleteAttendant('${a.id}')" title="Excluir Atendente ${a.name}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const renderServicesTable = () => {
    const tbody = document.getElementById('servicesTableBody');
    const countEl = document.getElementById('countActiveServices');
    if (!tbody) return;

    const services = getServicesList();
    const activeCount = services.filter(s => s.active).length;
    if (countEl) countEl.innerText = activeCount;

    if (services.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
            <i class="fa-solid fa-arrows-rotate fa-spin" style="margin-right: 8px; color: #f59e0b;"></i>
            Sincronizando assuntos da Planilha Google... Cadastre novos assuntos no formulário acima ou clique em "Sincronizar da Planilha".
          </td>
        </tr>
      `;
      return;
    }

    // Mapa de contagem de avaliações por serviço
    const evalCounts = {};
    state.responses.forEach(r => {
      const name = r.tipo_servico || '';
      evalCounts[name] = (evalCounts[name] || 0) + 1;
    });

    tbody.innerHTML = services.map(s => {
      const count = evalCounts[s.name] || 0;
      const statusBadge = s.active 
        ? '<span class="status-badge-active"><i class="fa-solid fa-circle-check"></i> Ativo no Totem</span>'
        : '<span class="status-badge-inactive"><i class="fa-solid fa-circle-xmark"></i> Inativo / Oculto</span>';

      const toggleIcon = s.active ? '<i class="fa-solid fa-eye-slash"></i> Desativar' : '<i class="fa-solid fa-eye"></i> Ativar';
      const toggleTitle = s.active ? 'Ocultar assunto do Totem Cidadão' : 'Ativar assunto para seleção no Totem';

      return `
        <tr>
          <td>
            <strong><i class="fa-solid fa-folder" style="color: #f59e0b; margin-right: 6px;"></i>${s.name}</strong>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">
            <span class="role-badge" style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); color: var(--text-main); font-size: 0.72rem;">
              ${s.category}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td style="text-align: center;">
            <span class="eval-count-tag"><strong>${count}</strong> ${count === 1 ? 'avaliação' : 'avaliações'}</span>
          </td>
          <td style="text-align: center;">
            <div style="display: inline-flex; gap: 6px;">
              <button type="button" class="btn-action-toggle" onclick="App.toggleServiceStatus('${s.id}')" title="${toggleTitle}">
                ${toggleIcon}
              </button>
              <button type="button" class="btn-outline-danger btn-sm" onclick="App.deleteService('${s.id}')" title="Excluir Assunto ${s.name}">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  };

  const addAttendant = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode cadastrar novos atendentes.', 'error');
      return;
    }

    const nameInp = document.getElementById('inputAttendantName');
    const roleInp = document.getElementById('inputAttendantRole');

    const name = nameInp ? nameInp.value.trim() : '';
    const role = roleInp ? roleInp.value.trim() : '';

    if (!name || name.length < 3) {
      showToast('Por favor, informe o nome completo do atendente/servidor.', 'warning');
      nameInp?.focus();
      return;
    }

    if (!role || role.length < 2) {
      showToast('Informe a especialidade ou guichê de atendimento.', 'warning');
      roleInp?.focus();
      return;
    }

    const attendants = getAttendantsList();
    if (attendants.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      showToast(`O atendente '${name}' já está cadastrado.`, 'error');
      nameInp?.focus();
      return;
    }

    const newAttendant = {
      id: 'att-' + Date.now(),
      name: name,
      role: role,
      active: true,
      createdAt: new Date().toISOString()
    };

    attendants.push(newAttendant);
    saveAttendantsList(attendants, true);

    if (nameInp) nameInp.value = '';
    if (roleInp) roleInp.value = '';

    showToast(`Atendente '${name}' cadastrado e salvo na Planilha Google!`, 'success');
    renderAttendantsTable();
    populateDropdowns();
  };

  const toggleAttendantStatus = (id) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode alterar o status de atendentes.', 'error');
      return;
    }

    const attendants = getAttendantsList();
    const item = attendants.find(a => a.id === id);
    if (!item) {
      showToast('Atendente não encontrado.', 'error');
      return;
    }

    // Se estiver desativando, verifica se não é o único ativo
    if (item.active && attendants.filter(a => a.active).length <= 1) {
      showToast('Deve haver ao menos um atendente ativo para o funcionamento do Totem.', 'warning');
      return;
    }

    item.active = !item.active;
    saveAttendantsList(attendants, true);

    const statusMsg = item.active ? 'ativado no Totem' : 'desativado (oculto no Totem)';
    showToast(`Atendente '${item.name}' ${statusMsg} e atualizado na Planilha Google.`, 'info');
    renderAttendantsTable();
    populateDropdowns();
  };

  const deleteAttendant = (id) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode excluir atendentes.', 'error');
      return;
    }

    const attendants = getAttendantsList();
    const target = attendants.find(a => a.id === id);
    if (!target) {
      showToast('Atendente não encontrado.', 'error');
      return;
    }

    if (attendants.length <= 1) {
      showToast('Não é possível excluir o único atendente da base.', 'error');
      return;
    }

    if (!confirm(`Confirma a exclusão do(a) atendente '${target.name}'? O histórico de avaliações já registradas será mantido.`)) {
      return;
    }

    const updated = attendants.filter(a => a.id !== id);
    saveAttendantsList(updated, true);

    showToast(`Atendente '${target.name}' excluído e atualizado na Planilha Google.`, 'info');
    renderAttendantsTable();
    populateDropdowns();
  };

  const addService = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode cadastrar novos assuntos.', 'error');
      return;
    }

    const nameInp = document.getElementById('inputServiceName');
    const catInp = document.getElementById('inputServiceCategory');

    const name = nameInp ? nameInp.value.trim() : '';
    const category = catInp ? catInp.value : 'Atendimento Geral';

    if (!name || name.length < 3) {
      showToast('Por favor, informe a descrição do assunto principal / serviço.', 'warning');
      nameInp?.focus();
      return;
    }

    const services = getServicesList();
    if (services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      showToast(`O assunto '${name}' já está cadastrado.`, 'error');
      nameInp?.focus();
      return;
    }

    const newService = {
      id: 'srv-' + Date.now(),
      name: name,
      category: category,
      active: true,
      createdAt: new Date().toISOString()
    };

    services.push(newService);
    saveServicesList(services, true);

    if (nameInp) nameInp.value = '';

    showToast(`Assunto '${name}' cadastrado e salvo na Planilha Google!`, 'success');
    renderServicesTable();
    populateDropdowns();
  };

  const toggleServiceStatus = (id) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode alterar o status de assuntos.', 'error');
      return;
    }

    const services = getServicesList();
    const item = services.find(s => s.id === id);
    if (!item) {
      showToast('Assunto não encontrado.', 'error');
      return;
    }

    // Se estiver desativando, verifica se não é o único ativo
    if (item.active && services.filter(s => s.active).length <= 1) {
      showToast('Deve haver ao menos um assunto ativo para o funcionamento do Totem.', 'warning');
      return;
    }

    item.active = !item.active;
    saveServicesList(services, true);

    const statusMsg = item.active ? 'ativado no Totem' : 'desativado (oculto no Totem)';
    showToast(`Assunto '${item.name}' ${statusMsg} e atualizado na Planilha Google.`, 'info');
    renderServicesTable();
    populateDropdowns();
  };

  const deleteService = (id) => {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      showToast('Apenas o Administrador pode excluir assuntos.', 'error');
      return;
    }

    const services = getServicesList();
    const target = services.find(s => s.id === id);
    if (!target) {
      showToast('Assunto não encontrado.', 'error');
      return;
    }

    if (services.length <= 1) {
      showToast('Não é possível excluir o único assunto da base.', 'error');
      return;
    }

    if (!confirm(`Confirma a exclusão do assunto principal '${target.name}'? O histórico de avaliações já registradas será mantido.`)) {
      return;
    }

    const updated = services.filter(s => s.id !== id);
    saveServicesList(updated, true);

    showToast(`Assunto '${target.name}' excluído e atualizado na Planilha Google.`, 'info');
    renderServicesTable();
    populateDropdowns();
  };

  // --- NAVEGAÇÃO DE VIEWS & GUARDA DE PERFIS ---
  const switchView = (viewName) => {
    // 1. Modo exclusivo Cidadão (?perfil=cidadao)
    if (state.isCitizenOnlyUrl && viewName !== 'totem') {
      showToast('O acesso via QR Code móvel é exclusivo para a realização da pesquisa.', 'warning');
      return;
    }

    // 2. Totem: Acesso livre para todos (Cidadão, Gestor ou Administrador)
    if (viewName === 'totem') {
      // Permitido livremente
    }
    // 3. Dashboard e Relatório Executivo: Gestor ou Administrador
    else if (viewName === 'dashboard' || viewName === 'relatorio') {
      if (!state.currentUser) {
        state.pendingTargetView = viewName;
        openLoginModal(viewName);
        showToast('Área restrita a Gestores e Administradores. Por favor, autentique-se.', 'warning');
        return;
      }
    }
    // 4. Cadastros Operacionais e Configurações: Exclusivo para Administrador (Gestor bloqueado)
    else if (viewName === 'cadastros' || viewName === 'config') {
      if (!state.currentUser) {
        state.pendingTargetView = viewName;
        openLoginModal(viewName);
        showToast('Esta seção exige autenticação com o perfil Administrador.', 'warning');
        return;
      }
      if (state.currentUser.role !== 'admin') {
        const areaLabel = viewName === 'cadastros' 
          ? 'O cadastro de atendentes e assuntos é exclusivo' 
          : 'As configurações do sistema são exclusivas';
        state.pendingTargetView = viewName;
        openLoginModal(viewName);
        showToast(`Acesso restrito: ${areaLabel} para o Administrador. Por favor, autentique-se como admin.`, 'warning');
        return;
      }
    }

    state.currentView = viewName;

    // Atualiza botões
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = {
      totem: 'btnModeTotem',
      dashboard: 'btnModeDashboard',
      relatorio: 'btnModeRelatorio',
      cadastros: 'btnModeCadastros',
      config: 'btnModeConfig'
    }[viewName];
    if (activeBtn) document.getElementById(activeBtn)?.classList.add('active');

    // Atualiza seções
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const activeSec = {
      totem: 'viewTotem',
      dashboard: 'viewDashboard',
      relatorio: 'viewRelatorio',
      cadastros: 'viewCadastros',
      config: 'viewConfig'
    }[viewName];
    if (activeSec) document.getElementById(activeSec)?.classList.add('active');

    // Executa renderizadores específicos
    if (viewName === 'dashboard') {
      if (state.config.apiUrl) {
        loadDataFromSheets({ silent: true });
      } else {
        renderDashboard();
      }
    } else if (viewName === 'relatorio') {
      if (state.config.apiUrl) {
        loadDataFromSheets({ silent: true }).then(() => renderExecutiveReport());
      } else {
        renderExecutiveReport();
      }
    } else if (viewName === 'cadastros') {
      renderAttendantsTable();
      renderServicesTable();
      updateCadastrosCloudBadge('synced');
      if (state.config.apiUrl) {
        loadCadastrosFromSheets({ silent: true });
      }
    } else if (viewName === 'config') {
      loadSettings();
      renderConfigUsersTable();
      updateUsersCloudBadge('synced');
      if (state.config.apiUrl) {
        loadUsersFromSheets({ silent: true });
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- MOTOR DO TOTEM DE PESQUISA DO CIDADÃO ---
  const validateMetaFields = (showAlert = true) => {
    const selA = document.getElementById('selectAtendente');
    const selS = document.getElementById('selectTipoServico');
    let isValid = true;
    let missing = [];

    const atendenteVal = selA ? selA.value.trim() : (state.surveyData.atendente || '');
    const servicoVal = selS ? selS.value.trim() : (state.surveyData.tipo_servico || '');

    if (!atendenteVal) {
      isValid = false;
      missing.push('Atendente / Servidor');
      if (selA) selA.classList.add('is-invalid');
    } else {
      if (selA) selA.classList.remove('is-invalid');
    }

    if (!servicoVal) {
      isValid = false;
      missing.push('Assunto Principal');
      if (selS) selS.classList.add('is-invalid');
    } else {
      if (selS) selS.classList.remove('is-invalid');
    }

    if (!isValid && showAlert) {
      if (missing.length === 2) {
        showToast('Campos obrigatórios: selecione o Atendente e o Assunto nos campos acima.', 'warning');
      } else {
        showToast(`Campo obrigatório: selecione o ${missing[0]} no campo acima.`, 'warning');
      }

      // Foco imediato no primeiro campo vazio para orientar o cidadão
      if (!atendenteVal && selA) {
        selA.focus();
      } else if (!servicoVal && selS) {
        selS.focus();
      }
    }

    return isValid;
  };

  const onMetaChange = () => {
    const a = document.getElementById('selectAtendente');
    const s = document.getElementById('selectTipoServico');
    if (a) {
      state.surveyData.atendente = a.value;
      if (a.value) a.classList.remove('is-invalid');
    }
    if (s) {
      state.surveyData.tipo_servico = s.value;
      if (s.value) s.classList.remove('is-invalid');
    }
  };

  const selectCSAT = (value) => {
    state.surveyData.q1_csat = value;
    const ans = document.getElementById('answerQ1');
    if (ans) ans.value = value;
    document.querySelectorAll('.csat-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
    });

    // Se os campos obrigatórios ainda não foram preenchidos, orienta o cidadão e impede avanço
    if (!validateMetaFields(true)) {
      return;
    }

    // Avanço tátil imediato suave após 280ms
    setTimeout(() => nextStep(), 280);
  };

  const selectFCR = (value) => {
    state.surveyData.q2_fcr = value;
    document.getElementById('answerQ2').value = value;
    document.querySelectorAll('#gridQ2 .choice-card').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.value === value);
    });
    setTimeout(() => nextStep(), 280);
  };

  const selectClarity = (value) => {
    state.surveyData.q3_clareza = value;
    document.getElementById('answerQ3').value = value;
    document.querySelectorAll('.clarity-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.value) === value);
    });
    setTimeout(() => nextStep(), 280);
  };

  const selectAgility = (value) => {
    state.surveyData.q4_agilidade = value;
    document.getElementById('answerQ4').value = value;
    document.querySelectorAll('#gridQ4 .choice-card').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.value === value);
    });
    setTimeout(() => nextStep(), 280);
  };

  const appendQuickTag = (text) => {
    const area = document.getElementById('commentText');
    if (area) {
      if (area.value.trim().length > 0) {
        area.value = area.value.trim() + '. ' + text;
      } else {
        area.value = text;
      }
      onCommentInput();
    }
  };

  const onCommentInput = () => {
    const area = document.getElementById('commentText');
    const countEl = document.getElementById('charCount');
    if (area && countEl) {
      const len = area.value.length;
      countEl.innerText = `${len} / 500 caracteres`;
      state.surveyData.q5_comentario = area.value;
    }
  };

  const prevStep = () => {
    if (state.currentStep > 1) {
      state.currentStep--;
      updateTotemStepUI();
    }
  };

  const nextStep = () => {
    // Validação obrigatória dos campos de identificação do atendimento
    if (!validateMetaFields(true)) {
      return;
    }

    // Validação da etapa atual
    if (state.currentStep === 1 && !state.surveyData.q1_csat) {
      showToast('Por favor, selecione uma nota de 1 a 5.', 'warning');
      return;
    }
    if (state.currentStep === 2 && !state.surveyData.q2_fcr) {
      showToast('Por favor, informe se o seu atendimento foi resolvido.', 'warning');
      return;
    }
    if (state.currentStep === 3 && !state.surveyData.q3_clareza) {
      showToast('Por favor, informe o nível de clareza das explicações.', 'warning');
      return;
    }
    if (state.currentStep === 4 && !state.surveyData.q4_agilidade) {
      showToast('Por favor, avalie a agilidade do atendimento.', 'warning');
      return;
    }

    if (state.currentStep < state.totalSteps) {
      state.currentStep++;
      updateTotemStepUI();
    }
  };

  const updateTotemStepUI = () => {
    // Atualiza barra de progresso
    const progressFill = document.getElementById('progressFill');
    const indicatorText = document.getElementById('stepIndicatorText');
    const pct = (state.currentStep / state.totalSteps) * 100;
    
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (indicatorText) indicatorText.innerText = `Etapa ${state.currentStep} de ${state.totalSteps}`;

    // Atualiza visibilidade dos passos
    for (let i = 1; i <= state.totalSteps; i++) {
      const el = document.getElementById(`step${i}`);
      if (el) el.classList.toggle('active', i === state.currentStep);
    }

    // Botões de navegação
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');
    if (btnPrev) btnPrev.disabled = state.currentStep === 1;
    if (btnNext) {
      btnNext.style.display = state.currentStep === state.totalSteps ? 'none' : 'inline-flex';
    }

    // Em dispositivos móveis (smartphones), rola a visualização suavemente para o topo do Totem
    if (window.innerWidth <= 768) {
      const totemCard = document.getElementById('viewTotem');
      if (totemCard) {
        totemCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // --- SUBMISSÃO E PIPELINE DE ENGENHARIA DE DADOS ---
  const submitSurvey = async () => {
    if (!validateMetaFields(true)) {
      state.currentStep = 1;
      updateTotemStepUI();
      return;
    }

    const commentEl = document.getElementById('commentText');
    const comment = commentEl ? commentEl.value.trim() : '';
    state.surveyData.q5_comentario = comment;

    // Geração de Protocolo Oficial PGM
    const dateObj = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formattedDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
    const formattedTime = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const protocolCode = `SJM-DA-${dateObj.getFullYear()}-${randomSuffix}`;

    // NLP: Classificação de Sentimento Automática
    const sentiment = analyzeSentiment(comment);

    // Registro Consolidado
    const newRecord = {
      id: protocolCode,
      timestamp: dateObj.toISOString(),
      data: formattedDate,
      hora: formattedTime,
      atendente: state.surveyData.atendente || 'Servidor(a) Geral',
      tipo_servico: state.surveyData.tipo_servico || 'Outros Esclarecimentos',
      q1_csat: parseInt(state.surveyData.q1_csat) || 5,
      q2_fcr: state.surveyData.q2_fcr || 'Sim, totalmente',
      q3_clareza: parseInt(state.surveyData.q3_clareza) || 5,
      q4_agilidade: state.surveyData.q4_agilidade || 'Adequado',
      q5_comentario: comment,
      sentimento: sentiment,
      canal: 'Totem Presencial'
    };

    // Adiciona à memória temporária para feedback instantâneo na UI (SEM localStorage)
    state.responses.unshift(newRecord);
    updateStorageCounters();

    // Transmite diretamente para a Planilha Google
    if (state.config.apiUrl) {
      syncWithGoogleSheets(newRecord).then(() => {
        // Atualiza base a partir da planilha Google
        loadDataFromSheets({ silent: true });
      });
    }

    // Exibe Tela de Sucesso
    showSuccessStep(protocolCode);
  };

  const showSuccessStep = (protocolCode) => {
    // Esconde passos anteriores
    for (let i = 1; i <= state.totalSteps; i++) {
      document.getElementById(`step${i}`)?.classList.remove('active');
    }
    const successStep = document.getElementById('stepSuccess');
    if (successStep) successStep.classList.add('active');

    // Esconde rodapé do totem
    const footer = document.getElementById('surveyNavFooter');
    if (footer) footer.style.display = 'none';

    // Protocolo
    const pCodeEl = document.getElementById('registeredProtocol');
    if (pCodeEl) pCodeEl.innerText = protocolCode;

    // Em dispositivos móveis, rola suavemente para o início do Totem para ver o agradecimento e protocolo
    if (window.innerWidth <= 768) {
      const totemCard = document.getElementById('viewTotem');
      if (totemCard) {
        totemCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Contador regressivo para auto-reset
    state.resetCountdown = 5;
    const countEl = document.getElementById('resetCountdown');
    if (countEl) countEl.innerText = state.resetCountdown;

    clearInterval(state.resetTimer);
    state.resetTimer = setInterval(() => {
      state.resetCountdown--;
      if (countEl) countEl.innerText = state.resetCountdown;
      if (state.resetCountdown <= 0) {
        clearInterval(state.resetTimer);
        resetSurvey();
      }
    }, 1000);
  };

  const resetSurvey = () => {
    clearInterval(state.resetTimer);

    // Reseta estado do formulário e esvazia campos obrigatórios de atendimento
    state.currentStep = 1;
    state.surveyData.q1_csat = null;
    state.surveyData.q2_fcr = null;
    state.surveyData.q3_clareza = null;
    state.surveyData.q4_agilidade = null;
    state.surveyData.q5_comentario = '';
    state.surveyData.atendente = '';
    state.surveyData.tipo_servico = '';

    const selAtendente = document.getElementById('selectAtendente');
    if (selAtendente) {
      selAtendente.value = '';
      selAtendente.classList.remove('is-invalid');
    }

    const selServico = document.getElementById('selectTipoServico');
    if (selServico) {
      selServico.value = '';
      selServico.classList.remove('is-invalid');
    }

    document.querySelectorAll('.csat-btn, .choice-card, .clarity-btn').forEach(el => el.classList.remove('selected'));
    
    const commentEl = document.getElementById('commentText');
    if (commentEl) commentEl.value = '';
    onCommentInput();

    document.getElementById('stepSuccess')?.classList.remove('active');
    
    const footer = document.getElementById('surveyNavFooter');
    if (footer) footer.style.display = 'flex';

    updateTotemStepUI();
  };

  // --- MOTOR DE ANÁLISE DE SENTIMENTO & NLP ---
  const analyzeSentiment = (text) => {
    if (!text || text.trim().length === 0) return 'Neutro';
    
    const cleanText = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^\w\s]/gi, ' '); // remove pontuações

    const tokens = cleanText.split(/\s+/).filter(t => t.length > 2);
    let score = 0;

    tokens.forEach(token => {
      if (NLP_LEXICON.positive.includes(token)) score += 1.5;
      if (NLP_LEXICON.negative.includes(token)) score -= 1.8;
    });

    if (score > 0.5) return 'Positivo';
    if (score < -0.3) return 'Negativo';
    return 'Neutro';
  };

  // --- CÁLCULO DE KPIS & ANALYTICS ---
  const getFilteredResponses = () => {
    let list = [...state.responses];

    // Filtro por Período
    const now = new Date();
    if (state.filters.periodo === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      list = list.filter(r => r.data === todayStr);
    } else if (state.filters.periodo === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter(r => new Date(r.timestamp) >= past7);
    } else if (state.filters.periodo === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter(r => new Date(r.timestamp) >= past30);
    } else if (state.filters.periodo === 'month') {
      const currentYearMonth = now.toISOString().slice(0, 7);
      list = list.filter(r => r.data.startsWith(currentYearMonth));
    }

    // Filtro por Atendente / Servidor
    if (state.filters.atendente !== 'all') {
      list = list.filter(r => (r.atendente || r.guiche) === state.filters.atendente);
    }

    // Filtro por Serviço
    if (state.filters.servico !== 'all') {
      list = list.filter(r => r.tipo_servico === state.filters.servico);
    }

    return list;
  };

  const calculateKPIs = (data) => {
    const total = data.length;
    if (total === 0) {
      return {
        total: 0,
        csatPercent: 0,
        csatMedia: 0,
        csatDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        fcrPercent: 0,
        fcrParcialPercent: 0,
        fcrNaoPercent: 0,
        fcrCounts: { sim: 0, parcial: 0, nao: 0 },
        clarityMedia: 0,
        clarityPercent: 0,
        clarityDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        agilityPercent: 0,
        agilityDemoradoPercent: 0,
        agilityCounts: { 'Muito Rápido': 0, 'Adequado': 0, 'Demorado': 0, 'Muito Demorado': 0 },
        sentimentCounts: { Positivo: 0, Neutro: 0, Negativo: 0 },
        totalComentarios: 0
      };
    }

    // 1. CSAT (Top 2 Box: notas 4 e 5)
    let sumCSAT = 0;
    let countCSATPositive = 0;
    const csatDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // 2. FCR
    const fcrCounts = { sim: 0, parcial: 0, nao: 0 };

    // 3. Clareza
    let sumClarity = 0;
    let countClarityPromoters = 0;
    const clarityDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    // 4. Agilidade
    const agilityCounts = { 'Muito Rápido': 0, 'Adequado': 0, 'Demorado': 0, 'Muito Demorado': 0 };

    // 5. Sentimento & Comentários
    const sentimentCounts = { Positivo: 0, Neutro: 0, Negativo: 0 };
    let totalComentarios = 0;

    data.forEach(r => {
      // CSAT
      const q1 = parseInt(r.q1_csat) || 0;
      sumCSAT += q1;
      if (csatDist[q1] !== undefined) csatDist[q1]++;
      if (q1 >= 4) countCSATPositive++;

      // FCR
      if (r.q2_fcr === 'Sim, totalmente') fcrCounts.sim++;
      else if (r.q2_fcr === 'Parcialmente') fcrCounts.parcial++;
      else fcrCounts.nao++;

      // Clareza
      const q3 = parseInt(r.q3_clareza) || 0;
      sumClarity += q3;
      if (clarityDist[q3] !== undefined) clarityDist[q3]++;
      if (q3 >= 4) countClarityPromoters++;

      // Agilidade
      if (agilityCounts[r.q4_agilidade] !== undefined) {
        agilityCounts[r.q4_agilidade]++;
      } else {
        agilityCounts['Adequado']++;
      }

      // Sentimento
      if (sentimentCounts[r.sentimento] !== undefined) {
        sentimentCounts[r.sentimento]++;
      }
      if (r.q5_comentario && r.q5_comentario.trim().length > 0) {
        totalComentarios++;
      }
    });

    const csatPercent = Math.round((countCSATPositive / total) * 100);
    const csatMedia = (sumCSAT / total).toFixed(1);

    const fcrPercent = Math.round((fcrCounts.sim / total) * 100);
    const fcrParcialPercent = Math.round((fcrCounts.parcial / total) * 100);
    const fcrNaoPercent = Math.round((fcrCounts.nao / total) * 100);

    const clarityMedia = (sumClarity / total).toFixed(1);
    const clarityPercent = Math.round((countClarityPromoters / total) * 100);

    const agilityGoodCount = (agilityCounts['Muito Rápido'] || 0) + (agilityCounts['Adequado'] || 0);
    const agilityBadCount = (agilityCounts['Demorado'] || 0) + (agilityCounts['Muito Demorado'] || 0);
    const agilityPercent = Math.round((agilityGoodCount / total) * 100);
    const agilityDemoradoPercent = Math.round((agilityBadCount / total) * 100);

    return {
      total,
      csatPercent,
      csatMedia,
      csatDistribution: csatDist,
      fcrPercent,
      fcrParcialPercent,
      fcrNaoPercent,
      fcrCounts,
      clarityMedia,
      clarityPercent,
      clarityDistribution: clarityDist,
      agilityPercent,
      agilityDemoradoPercent,
      agilityCounts,
      sentimentCounts,
      totalComentarios
    };
  };

  // --- RENDERIZADORES DO PAINEL DE KPIS ---
  const applyFilters = () => {
    const fPer = document.getElementById('filterPeriodo');
    const fAte = document.getElementById('filterAtendente');
    const fSer = document.getElementById('filterServico');

    if (fPer) state.filters.periodo = fPer.value;
    if (fAte) state.filters.atendente = fAte.value;
    if (fSer) state.filters.servico = fSer.value;

    state.tablePage = 1;
    renderDashboard();
  };

  const renderDashboard = () => {
    const filtered = getFilteredResponses();
    const kpis = calculateKPIs(filtered);

    // 1. Atualizar Cards Executivos
    renderExecutiveCards(kpis);

    // 2. Gráficos
    renderCSATHistogram(kpis.csatDistribution, kpis.total);
    renderFCRDonut(kpis.fcrCounts, kpis.total);
    renderAgilityGauges(kpis.agilityCounts, kpis.total);
    renderClarityHistogram(kpis.clarityDistribution, kpis.total);

    // 3. Nuvem de Palavras & Sentimento
    renderWordCloud(filtered);
    renderSentimentPanel(kpis.sentimentCounts, kpis.total);

    // 4. Feed de Comentários
    renderCommentsFeed(filtered);

    // 5. Avaliação de Desempenho Funcional por Servidor
    renderServantPerformance(filtered);

    // 6. Tabela Geral de Registros
    renderTable(filtered);
  };

  const renderExecutiveCards = (kpis) => {
    // CSAT
    const elCSATPct = document.getElementById('kpiCSATPercent');
    const elCSATMed = document.getElementById('kpiCSATMedia');
    if (elCSATPct) elCSATPct.innerText = `${kpis.csatPercent}%`;
    if (elCSATMed) elCSATMed.innerText = kpis.csatMedia;

    // FCR
    const elFCRPct = document.getElementById('kpiFCRPercent');
    const elFCRPar = document.getElementById('kpiFCRParcial');
    const elFCRNao = document.getElementById('kpiFCRNao');
    if (elFCRPct) elFCRPct.innerText = `${kpis.fcrPercent}%`;
    if (elFCRPar) elFCRPar.innerText = `${kpis.fcrParcialPercent}%`;
    if (elFCRNao) elFCRNao.innerText = `${kpis.fcrNaoPercent}%`;

    // Clareza
    const elClaMed = document.getElementById('kpiClarityMedia');
    const elClaPct = document.getElementById('kpiClarityPercent');
    if (elClaMed) elClaMed.innerText = kpis.clarityMedia;
    if (elClaPct) elClaPct.innerText = `${kpis.clarityPercent}%`;

    // Agilidade
    const elAgiPct = document.getElementById('kpiAgilityPercent');
    const elAgiDem = document.getElementById('kpiAgilityDemorado');
    if (elAgiPct) elAgiPct.innerText = `${kpis.agilityPercent}%`;
    if (elAgiDem) elAgiDem.innerText = `${kpis.agilityDemoradoPercent}%`;

    // Volume
    const elTotRes = document.getElementById('kpiTotalRespostas');
    const elTotCom = document.getElementById('kpiTotalComentarios');
    if (elTotRes) elTotRes.innerText = kpis.total;
    if (elTotCom) elTotCom.innerText = kpis.totalComentarios;
  };

  const renderCSATHistogram = (distribution, total) => {
    const container = document.getElementById('chartCSATDistribution');
    if (!container) return;

    const labels = {
      5: '5 ★ Muito Satisfeito',
      4: '4 ★ Satisfeito',
      3: '3 ★ Regular',
      2: '2 ★ Insatisfeito',
      1: '1 ★ Muito Insatisfeito'
    };

    const colors = {
      5: '#10b981',
      4: '#0096c7',
      3: '#f59e0b',
      2: '#f97316',
      1: '#ef4444'
    };

    let html = '';
    for (let note = 5; note >= 1; note--) {
      const count = distribution[note] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      html += `
        <div class="bar-row">
          <span class="bar-label">${note} estrelas</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background: ${colors[note]};">
              ${pct > 8 ? pct + '%' : ''}
            </div>
          </div>
          <span class="bar-count">${count} (${pct}%)</span>
        </div>
      `;
    }
    container.innerHTML = html;
  };

  const renderFCRDonut = (counts, total) => {
    const container = document.getElementById('chartFCRContainer');
    if (!container) return;

    const sim = counts.sim || 0;
    const par = counts.parcial || 0;
    const nao = counts.nao || 0;

    const simPct = total > 0 ? Math.round((sim / total) * 100) : 0;
    const parPct = total > 0 ? Math.round((par / total) * 100) : 0;
    const naoPct = total > 0 ? Math.round((nao / total) * 100) : 0;

    // SVG Circular Donut
    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~339.29
    const strokeDashSim = (simPct / 100) * circumference;
    const strokeDashPar = (parPct / 100) * circumference;
    const strokeDashNao = (naoPct / 100) * circumference;

    const offsetPar = circumference - strokeDashSim;
    const offsetNao = offsetPar - strokeDashPar;

    container.innerHTML = `
      <div class="donut-svg-wrap">
        <svg width="140" height="140" viewBox="0 0 140 140" style="transform: rotate(-90deg);">
          <!-- Fundo -->
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="rgba(100,116,139,0.15)" stroke-width="18" />
          <!-- Sim -->
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="#10b981" stroke-width="18"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - strokeDashSim}" stroke-linecap="round" />
          <!-- Parcial -->
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="18"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offsetPar}" />
          <!-- Não -->
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="#ef4444" stroke-width="18"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offsetNao}" />
        </svg>
        <div class="donut-center-label">
          <span class="big-val">${simPct}%</span>
          <span class="small-txt">FCR Total</span>
        </div>
      </div>

      <div class="donut-legend">
        <div class="donut-legend-item">
          <span class="legend-color-box" style="background: #10b981;"></span>
          <span>Sim, totalmente: <strong>${sim} (${simPct}%)</strong></span>
        </div>
        <div class="donut-legend-item">
          <span class="legend-color-box" style="background: #f59e0b;"></span>
          <span>Parcialmente: <strong>${par} (${parPct}%)</strong></span>
        </div>
        <div class="donut-legend-item">
          <span class="legend-color-box" style="background: #ef4444;"></span>
          <span>Não resolvido: <strong>${nao} (${naoPct}%)</strong></span>
        </div>
      </div>
    `;
  };

  const renderAgilityGauges = (counts, total) => {
    const container = document.getElementById('chartAgilityContainer');
    if (!container) return;

    const items = [
      { key: 'Muito Rápido', color: '#0096c7' },
      { key: 'Adequado', color: '#10b981' },
      { key: 'Demorado', color: '#f59e0b' },
      { key: 'Muito Demorado', color: '#ef4444' }
    ];

    let html = '';
    items.forEach(it => {
      const c = counts[it.key] || 0;
      const pct = total > 0 ? Math.round((c / total) * 100) : 0;
      html += `
        <div class="bar-row">
          <span class="bar-label" style="width: 120px;">${it.key}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background: ${it.color};">
              ${pct > 8 ? pct + '%' : ''}
            </div>
          </div>
          <span class="bar-count">${c} (${pct}%)</span>
        </div>
      `;
    });
    container.innerHTML = html;
  };

  const renderClarityHistogram = (distribution, total) => {
    const container = document.getElementById('chartClarityDistribution');
    if (!container) return;

    let html = '';
    const labels = { 5: 'Muito Claras', 4: 'Claras', 3: 'Razoáveis', 2: 'Pouco Claras', 1: 'Nada Claras' };
    const colors = { 5: '#0284c7', 4: '#38bdf8', 3: '#cbd5e1', 2: '#fb923c', 1: '#f87171' };

    for (let note = 5; note >= 1; note--) {
      const count = distribution[note] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      html += `
        <div class="bar-row">
          <span class="bar-label" style="width: 110px;">${note} • ${labels[note]}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background: ${colors[note]};">
              ${pct > 8 ? pct + '%' : ''}
            </div>
          </div>
          <span class="bar-count">${count} (${pct}%)</span>
        </div>
      `;
    }
    container.innerHTML = html;
  };

  // --- NUVEM DE PALAVRAS E INTELIGÊNCIA QUALITATIVA ---
  const renderWordCloud = (data) => {
    const container = document.getElementById('wordCloudContainer');
    if (!container) return;

    const wordCounts = {};
    data.forEach(r => {
      if (!r.q5_comentario) return;
      const clean = r.q5_comentario.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/gi, ' ');
      
      const words = clean.split(/\s+/).filter(w => w.length > 3 && !NLP_LEXICON.stopWords.has(w));
      words.forEach(w => {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      });
    });

    const entries = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 24);
    if (entries.length === 0) {
      container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Nenhum comentário registrado no período filtrado.</span>';
      return;
    }

    const maxCount = entries[0][1];
    let html = '';

    entries.forEach(([word, count]) => {
      // Tamanho dinâmico de 0.8rem a 1.6rem
      const sizeRem = (0.8 + (count / maxCount) * 0.8).toFixed(2);
      
      // Classificação de cor por léxico
      let cls = 'neu';
      if (NLP_LEXICON.positive.includes(word)) cls = 'pos';
      else if (NLP_LEXICON.negative.includes(word)) cls = 'neg';

      html += `<span class="cloud-tag ${cls}" style="font-size: ${sizeRem}rem;" title="${count} ocorrências">${word} (${count})</span>`;
    });

    container.innerHTML = html;
  };

  const renderSentimentPanel = (counts, total) => {
    const barsContainer = document.getElementById('sentimentBars');
    const summaryContainer = document.getElementById('sentimentSummaryBox');
    if (!barsContainer) return;

    const pos = counts.Positivo || 0;
    const neu = counts.Neutro || 0;
    const neg = counts.Negativo || 0;

    const posPct = total > 0 ? Math.round((pos / total) * 100) : 0;
    const neuPct = total > 0 ? Math.round((neu / total) * 100) : 0;
    const negPct = total > 0 ? Math.round((neg / total) * 100) : 0;

    barsContainer.innerHTML = `
      <div class="sentiment-row">
        <span class="sentiment-name" style="color: var(--success);"><i class="fa-regular fa-face-smile"></i> Elogios</span>
        <div class="sentiment-track">
          <div class="sentiment-fill pos" style="width: ${posPct}%;"></div>
        </div>
        <span class="sentiment-val">${posPct}%</span>
      </div>

      <div class="sentiment-row">
        <span class="sentiment-name" style="color: var(--warning);"><i class="fa-regular fa-face-meh"></i> Neutros</span>
        <div class="sentiment-track">
          <div class="sentiment-fill neu" style="width: ${neuPct}%;"></div>
        </div>
        <span class="sentiment-val">${neuPct}%</span>
      </div>

      <div class="sentiment-row">
        <span class="sentiment-name" style="color: var(--danger);"><i class="fa-regular fa-face-frown"></i> Críticas</span>
        <div class="sentiment-track">
          <div class="sentiment-fill neg" style="width: ${negPct}%;"></div>
        </div>
        <span class="sentiment-val">${negPct}%</span>
      </div>
    `;

    if (summaryContainer) {
      if (posPct >= 70) {
        summaryContainer.innerHTML = `<strong>Alta Aprovação Cidadã:</strong> A imensa maioria das manifestações destaca o acolhimento, educação e rapidez no esclarecimento de débitos municipais.`;
      } else if (negPct >= 25) {
        summaryContainer.innerHTML = `<strong>Atenção Operacional:</strong> Aumento relevante nas queixas relacionadas ao tempo de espera em fila ou instabilidade de sistema.`;
      } else {
        summaryContainer.innerHTML = `<strong>Percepção Equilibrada:</strong> Atendimento regular com menções positivas à equipe de negociação e oportunidade de melhoria no fluxo.`;
      }
    }
  };

  // --- FEED DE COMENTÁRIOS RECENTES ---
  const renderCommentsFeed = (data) => {
    const container = document.getElementById('commentsStream');
    const filterSelect = document.getElementById('feedFilterSentiment');
    if (!container) return;

    const filterVal = filterSelect ? filterSelect.value : 'all';
    
    let list = data.filter(r => r.q5_comentario && r.q5_comentario.trim().length > 0);
    if (filterVal !== 'all') {
      list = list.filter(r => r.sentimento === filterVal);
    }

    if (list.length === 0) {
      container.innerHTML = '<span style="color: var(--text-muted); padding: 20px;">Nenhum comentário correspondente encontrado.</span>';
      return;
    }

    let html = '';
    list.slice(0, 15).forEach(r => {
      html += `
        <div class="comment-card">
          <div class="comment-card-top">
            <span><strong>${r.id}</strong> • ${r.data}</span>
            <span class="badge-sentiment ${r.sentimento}">${r.sentimento}</span>
          </div>
          <p class="comment-text-body">"${r.q5_comentario}"</p>
          <div class="comment-tags-row">
            <span><i class="fa-solid fa-user-tie"></i> ${r.atendente || r.guiche}</span> •
            <span><i class="fa-solid fa-star" style="color: #f59e0b;"></i> CSAT: ${r.q1_csat}/5</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  };

  const filterCommentsFeed = () => {
    const filtered = getFilteredResponses();
    renderCommentsFeed(filtered);
  };

  // --- TABELA GERAL DE REGISTROS COM BUSCA E PAGINAÇÃO ---
  const searchTable = () => {
    const input = document.getElementById('tableSearchInput');
    state.tableSearch = input ? input.value.trim().toLowerCase() : '';
    state.tablePage = 1;
    const filtered = getFilteredResponses();
    renderTable(filtered);
  };

  const renderTable = (data) => {
    const tbody = document.getElementById('responsesTableBody');
    const paginationEl = document.getElementById('tablePagination');
    if (!tbody) return;

    let list = [...data];
    if (state.tableSearch) {
      list = list.filter(r => 
        r.id.toLowerCase().includes(state.tableSearch) ||
        (r.atendente || r.guiche || '').toLowerCase().includes(state.tableSearch) ||
        r.tipo_servico.toLowerCase().includes(state.tableSearch) ||
        (r.q5_comentario && r.q5_comentario.toLowerCase().includes(state.tableSearch))
      );
    }

    const totalRecords = list.length;
    const totalPages = Math.ceil(totalRecords / state.tablePageSize) || 1;
    if (state.tablePage > totalPages) state.tablePage = totalPages;

    const start = (state.tablePage - 1) * state.tablePageSize;
    const pagedList = list.slice(start, start + state.tablePageSize);

    if (pagedList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">Nenhum registro encontrado.</td></tr>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    let html = '';
    pagedList.forEach(r => {
      html += `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.data} ${r.hora}</td>
          <td><i class="fa-solid fa-user-tie" style="color: var(--accent-cyan); margin-right: 6px;"></i><strong>${r.atendente || r.guiche}</strong></td>
          <td>${r.tipo_servico}</td>
          <td><span class="trend-badge ${r.q1_csat >= 4 ? 'positive' : (r.q1_csat === 3 ? 'neutral' : 'danger')}">${r.q1_csat} ★</span></td>
          <td><span class="trend-badge ${r.q2_fcr === 'Sim, totalmente' ? 'positive' : (r.q2_fcr === 'Parcialmente' ? 'warning' : 'danger')}">${r.q2_fcr}</span></td>
          <td>${r.q3_clareza} / 5</td>
          <td>${r.q4_agilidade}</td>
          <td><span class="badge-sentiment ${r.sentimento}">${r.sentimento}</span></td>
          <td title="${r.q5_comentario || ''}">${r.q5_comentario ? (r.q5_comentario.slice(0, 38) + (r.q5_comentario.length > 38 ? '...' : '')) : '-'}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

    // Paginação
    if (paginationEl) {
      paginationEl.innerHTML = `
        <span>Página <strong>${state.tablePage}</strong> de <strong>${totalPages}</strong> (${totalRecords} registros)</span>
        <button type="button" class="btn-dash-action" onclick="App.changeTablePage(-1)" ${state.tablePage === 1 ? 'disabled' : ''}>Anterior</button>
        <button type="button" class="btn-dash-action" onclick="App.changeTablePage(1)" ${state.tablePage >= totalPages ? 'disabled' : ''}>Próxima</button>
      `;
    }
  };

  const changeTablePage = (delta) => {
    state.tablePage += delta;
    const filtered = getFilteredResponses();
    renderTable(filtered);
  };

  // --- AVALIAÇÃO DE DESEMPENHO FUNCIONAL DOS SERVIDORES NO EXERCÍCIO DA FUNÇÃO ---
  const renderServantPerformance = (data) => {
    const tbody = document.getElementById('servantsPerformanceTableBody');
    if (!tbody) return;

    // Agrupa dados por servidor / atendente
    const grouped = {};
    data.forEach(r => {
      const name = r.atendente || r.guiche || 'Servidor(a) Geral';
      if (!grouped[name]) {
        grouped[name] = {
          name,
          total: 0,
          csatScores: [],
          fcrSim: 0,
          clarityScores: [],
          agilityFast: 0,
          sentiments: { Positivo: 0, Neutro: 0, Negativo: 0 }
        };
      }
      const item = grouped[name];
      item.total++;
      if (r.q1_csat) item.csatScores.push(Number(r.q1_csat));
      if (r.q2_fcr === 'Sim, totalmente') item.fcrSim++;
      if (r.q3_clareza) item.clarityScores.push(Number(r.q3_clareza));
      if (r.q4_agilidade === 'Muito Rápido' || r.q4_agilidade === 'Adequado') item.agilityFast++;
      if (r.sentimento && item.sentiments[r.sentimento] !== undefined) {
        item.sentiments[r.sentimento]++;
      }
    });

    const list = Object.values(grouped).map(item => {
      const csatHighCount = item.csatScores.filter(s => s >= 4).length;
      const csatPercent = item.total > 0 ? Math.round((csatHighCount / item.total) * 100) : 0;
      const csatAvg = item.csatScores.length > 0 
        ? (item.csatScores.reduce((a, b) => a + b, 0) / item.csatScores.length).toFixed(1) 
        : '0.0';
      const fcrPercent = item.total > 0 ? Math.round((item.fcrSim / item.total) * 100) : 0;
      const clarityAvg = item.clarityScores.length > 0 
        ? (item.clarityScores.reduce((a, b) => a + b, 0) / item.clarityScores.length).toFixed(1) 
        : '0.0';
      const agilityPercent = item.total > 0 ? Math.round((item.agilityFast / item.total) * 100) : 0;
      const posPercent = item.total > 0 ? Math.round((item.sentiments.Positivo / item.total) * 100) : 0;

      let badgeClass = 'positive';
      let badgeText = '⭐ Excelente / Destaque';
      if (csatPercent >= 90 && fcrPercent >= 80) {
        badgeClass = 'positive';
        badgeText = '⭐ Destaque Funcional';
      } else if (csatPercent >= 75) {
        badgeClass = 'info';
        badgeText = '✅ Padrão Conforme';
      } else {
        badgeClass = 'danger';
        badgeText = '⚠️ Requer Atenção';
      }

      return {
        name: item.name,
        total: item.total,
        csatPercent,
        csatAvg,
        fcrPercent,
        clarityAvg,
        agilityPercent,
        posPercent,
        badgeClass,
        badgeText
      };
    });

    list.sort((a, b) => b.total - a.total || b.csatPercent - a.csatPercent);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">Nenhum servidor com atendimentos registrados no filtro selecionado.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0a1f38, #2563eb); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem;">
              ${s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <strong style="color: var(--text-main);">${s.name}</strong>
            </div>
          </div>
        </td>
        <td><strong>${s.total}</strong> atend.</td>
        <td>
          <span class="trend-badge ${s.csatPercent >= 85 ? 'positive' : (s.csatPercent >= 75 ? 'neutral' : 'danger')}">
            ${s.csatPercent}% (${s.csatAvg} ★)
          </span>
        </td>
        <td>
          <span class="trend-badge ${s.fcrPercent >= 80 ? 'positive' : 'neutral'}">
            ${s.fcrPercent}%
          </span>
        </td>
        <td><strong>${s.clarityAvg}</strong> / 5.0</td>
        <td>${s.agilityPercent}%</td>
        <td>
          <span class="badge-sentiment ${s.posPercent >= 70 ? 'Positivo' : (s.posPercent >= 40 ? 'Neutro' : 'Negativo')}">
            ${s.posPercent}% elogios
          </span>
        </td>
        <td><span class="trend-badge ${s.badgeClass}">${s.badgeText}</span></td>
        <td>
          <button type="button" class="btn-dash-action" style="padding: 4px 10px; font-size: 0.75rem;" onclick="App.filterByServant('${s.name}')" title="Filtrar dados deste servidor">
            <i class="fa-solid fa-filter"></i> Filtrar
          </button>
        </td>
      </tr>
    `).join('');
  };

  const filterByServant = (name) => {
    const fAte = document.getElementById('filterAtendente');
    if (fAte) fAte.value = name;
    state.filters.atendente = name;
    state.tablePage = 1;
    renderDashboard();
    showToast(`Painel filtrado para o(a) servidor(a): ${name}`, 'info');
  };

  // --- RELATÓRIO EXECUTIVO OFICIAL (PARA O PREFEITO E PROCURADOR) ---
  const renderExecutiveReport = () => {
    const data = getFilteredResponses();
    const kpis = calculateKPIs(data);
    const goals = state.config.goals;

    // Metadados
    const dNow = new Date();
    document.getElementById('repEmissionDate').innerText = dNow.toLocaleDateString('pt-BR');
    document.getElementById('repSampleSize').innerText = `${kpis.total} atendimentos auditados`;

    // 1. Tabela de Indicadores Estratégicos
    const tableBody = document.getElementById('repKpiSummaryBody');
    if (tableBody) {
      const getStatus = (val, meta) => {
        if (val >= meta) return '<span style="color: #10b981; font-weight: 700;">● CONFORME (Dentro da Meta)</span>';
        if (val >= meta * 0.85) return '<span style="color: #f59e0b; font-weight: 700;">▲ ATENÇÃO (Próximo à Meta)</span>';
        return '<span style="color: #ef4444; font-weight: 700;">■ CRÍTICO (Abaixo da Meta)</span>';
      };

      tableBody.innerHTML = `
        <tr>
          <td><strong>CSAT • Satisfação Geral</strong></td>
          <td>1. Qualidade geral do atendimento (1 a 5)</td>
          <td><strong>${kpis.csatPercent}%</strong> (Média ${kpis.csatMedia}/5.0)</td>
          <td>≥ ${goals.csat}%</td>
          <td>${getStatus(kpis.csatPercent, goals.csat)}</td>
        </tr>
        <tr>
          <td><strong>FCR • Resolutividade no 1º Contato</strong></td>
          <td>2. Motivo da ida à Dívida Ativa resolvido</td>
          <td><strong>${kpis.fcrPercent}%</strong> Sim (${kpis.fcrParcialPercent}% Parcial)</td>
          <td>≥ ${goals.fcr}%</td>
          <td>${getStatus(kpis.fcrPercent, goals.fcr)}</td>
        </tr>
        <tr>
          <td><strong>Clareza & Transparência Tributária</strong></td>
          <td>3. Clareza sobre débitos e parcelamento</td>
          <td><strong>${kpis.clarityMedia} / 5.0</strong> (${kpis.clarityPercent}% clareza alta)</td>
          <td>≥ ${goals.clarity} / 5.0</td>
          <td>${getStatus(kpis.clarityMedia, goals.clarity)}</td>
        </tr>
        <tr>
          <td><strong>Agilidade & SLA de Fila</strong></td>
          <td>4. Percepção do tempo total de atendimento</td>
          <td><strong>${kpis.agilityPercent}%</strong> Rápido/Adequado (${kpis.agilityDemoradoPercent}% Demorado)</td>
          <td>≥ ${goals.agility}%</td>
          <td>${getStatus(kpis.agilityPercent, goals.agility)}</td>
        </tr>
      `;
    }

    // 2. Tabela de Avaliação Individual dos Servidores no Relatório Executivo
    const repServantsBody = document.getElementById('repServantsTableBody');
    if (repServantsBody) {
      const grouped = {};
      data.forEach(r => {
        const name = r.atendente || r.guiche || 'Servidor(a) Geral';
        if (!grouped[name]) {
          grouped[name] = {
            name,
            total: 0,
            csatScores: [],
            fcrSim: 0,
            clarityScores: [],
            agilityFast: 0
          };
        }
        const item = grouped[name];
        item.total++;
        if (r.q1_csat) item.csatScores.push(Number(r.q1_csat));
        if (r.q2_fcr === 'Sim, totalmente') item.fcrSim++;
        if (r.q3_clareza) item.clarityScores.push(Number(r.q3_clareza));
        if (r.q4_agilidade === 'Muito Rápido' || r.q4_agilidade === 'Adequado') item.agilityFast++;
      });

      const sList = Object.values(grouped).map(item => {
        const csatHighCount = item.csatScores.filter(s => s >= 4).length;
        const csatPercent = item.total > 0 ? Math.round((csatHighCount / item.total) * 100) : 0;
        const csatAvg = item.csatScores.length > 0 
          ? (item.csatScores.reduce((a, b) => a + b, 0) / item.csatScores.length).toFixed(1) 
          : '0.0';
        const fcrPercent = item.total > 0 ? Math.round((item.fcrSim / item.total) * 100) : 0;
        const clarityAvg = item.clarityScores.length > 0 
          ? (item.clarityScores.reduce((a, b) => a + b, 0) / item.clarityScores.length).toFixed(1) 
          : '0.0';
        const agilityPercent = item.total > 0 ? Math.round((item.agilityFast / item.total) * 100) : 0;

        let conceito = '<span style="color: #10b981; font-weight:700;">● EXCELENTE (Destaque)</span>';
        if (csatPercent < 75 || fcrPercent < 70) {
          conceito = '<span style="color: #ef4444; font-weight:700;">■ REQUER CAPACITAÇÃO</span>';
        } else if (csatPercent < 85) {
          conceito = '<span style="color: #f59e0b; font-weight:700;">▲ BOM (Conforme)</span>';
        }

        return `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.total} atend.</td>
            <td><strong>${csatPercent}%</strong> (Média ${csatAvg}/5)</td>
            <td>${fcrPercent}% resolvido</td>
            <td>${clarityAvg} / 5.0</td>
            <td>${agilityPercent}% adequado</td>
            <td>${conceito}</td>
          </tr>
        `;
      });

      repServantsBody.innerHTML = sList.length > 0 ? sList.join('') : '<tr><td colspan="7" style="text-align:center; padding:12px;">Nenhum registro encontrado.</td></tr>';
    }

    // 3. Diagnóstico Técnico
    const diagEl = document.getElementById('repTechnicalDiagnosis');
    if (diagEl) {
      if (kpis.total === 0) {
        diagEl.innerHTML = `
          <p>No período analisado, ainda não constam avaliações registradas na base oficial do Google Sheets da Procuradoria. À medida que novos atendimentos forem realizados no Totem, os indicadores estatísticos e diagnósticos de conformidade serão calculados em tempo real.</p>
        `;
      } else {
        diagEl.innerHTML = `
          <p>No período analisado, o setor de Dívida Ativa da PGM de São João de Meriti registrou um índice de aprovação geral (CSAT) de <strong>${kpis.csatPercent}%</strong>, com nota média ponderada de <strong>${kpis.csatMedia}</strong> estrelas. Este número reflete uma receptividade institucional de alto padrão junto aos contribuintes munícipes.</p>
          <p style="margin-top: 8px;">A taxa de resolutividade no primeiro contato (FCR) alcançou <strong>${kpis.fcrPercent}%</strong> de resolução total imediata, comprovando a eficiência operacional dos servidores no atendimento presencial e evitando que o cidadão necessite reingressar nas filas da repartição. A clareza nas opções de parcelamento (média de <strong>${kpis.clarityMedia}</strong>) tem correlação direta com a efetiva arrecadação municipal, uma vez que o contribuinte devidamente esclarecido quanto a descontos de juros e multas formaliza o termo de confissão com expressiva taxa de adimplemento.</p>
        `;
      }
    }

    // 4. Diagnóstico Qualitativo e Ouvidoria
    const sentEl = document.getElementById('repSentimentDiagnosis');
    if (sentEl) {
      if (kpis.total === 0) {
        sentEl.innerHTML = `
          <p>Aguardando coleta de manifestações e comentários espontâneos dos cidadãos para processamento de inteligência léxica e análise de sentimento.</p>
        `;
      } else {
        const posPct = Math.round((kpis.sentimentCounts.Positivo / kpis.total) * 100);
        const negPct = Math.round((kpis.sentimentCounts.Negativo / kpis.total) * 100);
        sentEl.innerHTML = `
          <p>A análise algorítmica de Processamento de Linguagem Natural (NLP) sobre os comentários espontâneos aponta que <strong>${posPct}%</strong> das manifestações consistem em elogios diretos à cordialidade, presteza e humanização dos servidores de balcão.</p>
          <p style="margin-top: 8px;">Os pontos de fricção ou críticas representam <strong>${negPct}%</strong> da amostra e concentram-se predominantemente em momentos de pico no tempo de espera e solicitação de ampliação de terminais de consulta de processos de execução fiscal.</p>
        `;
      }
    }

    // 4. Plano de Ação
    const planEl = document.getElementById('repActionPlan');
    if (planEl) {
      planEl.innerHTML = `
        <div class="rep-action-item">
          <strong>1. Otimização da Triagem Prévia:</strong> Implementar checklist rápido na recepção para conferência prévia de documentos exigidos nos acordos de IPTU, reduzindo a perda de viagem do contribuinte.
        </div>
        <div class="rep-action-item">
          <strong>2. Guia Didático de Parcelamento:</strong> Disponibilizar infográfico impresso e digital sobre o escalonamento de juros e descontos concedidos pela Lei Municipal da Dívida Ativa.
        </div>
        <div class="rep-action-item">
          <strong>3. Modernização do Parque de Terminais:</strong> Justificar formalmente à Secretaria de Administração a aquisição de 2 novos computadores para acelerar a consulta processual no Guichê 05.
        </div>
      `;
    }
  };

  // --- SINCRONIZAÇÃO COM GOOGLE SHEETS & CLOUD ---
  const syncWithGoogleSheets = async (record) => {
    if (!state.config.apiUrl) return;

    try {
      // Envio via fetch POST com modo no-cors para evitar restrições de cross-origin comuns no Apps Script
      await fetch(state.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
        mode: 'no-cors'
      });
      console.log('Enviado ao Google Sheets com sucesso.');
    } catch (err) {
      console.warn('Falha na sincronização online (armazenado localmente):', err);
    }
  };

  const loadDataFromSheets = async (options = {}) => {
    const silent = options && options.silent === true;
    if (!state.config.apiUrl) {
      if (!silent) {
        showToast('Nenhuma URL do Google Sheets cadastrada. Acesse Configurações para vincular a planilha.', 'warning');
      }
      renderDashboard();
      return;
    }

    if (!silent) {
      showToast('Sincronizando avaliações da planilha Google...', 'info');
    }

    try {
      const response = await fetch(`${state.config.apiUrl}?action=getResponses`);
      if (response.ok) {
        const cloudData = await response.json();
        if (Array.isArray(cloudData)) {
          // Dados obtidos exclusivamente da Planilha Google (SEM armazenamento local)
          state.responses = cloudData;
          setConnectionStatus(true);

          renderDashboard();
          renderExecutiveReport();
          if (!silent) {
            showToast(`Sincronização concluída! ${cloudData.length} avaliações obtidas da Planilha Google.`, 'success');
          }
          return;
        }
      }
      throw new Error(`Resposta HTTP inesperada (${response.status})`);
    } catch (e) {
      console.warn('Falha na sincronização com Google Sheets:', e);
      setConnectionStatus(false);
      if (!silent) {
        showToast('Não foi possível conectar à planilha Google. Verifique a URL e a conexão.', 'error');
      }
    }
    renderDashboard();
  };

  const testConnection = async () => {
    const input = document.getElementById('inputApiUrl');
    const url = input ? input.value.trim() : (state.config.apiUrl || '');

    if (!url) {
      showToast('Por favor, informe a URL da Web App do Google Apps Script.', 'warning');
      return;
    }

    showToast('Testando conexão e leitura da planilha Google...', 'info');
    try {
      const response = await fetch(`${url}?action=getResponses`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          showToast(`Conexão confirmada com sucesso! ${data.length} avaliações lidas da planilha.`, 'success');
          setConnectionStatus(true);
          state.config.apiUrl = url;
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
          state.responses = data;
          renderDashboard();
          renderExecutiveReport();
          loadCadastrosFromSheets({ silent: true });
          loadUsersFromSheets({ silent: true });
          return;
        }
      }
      throw new Error('Falha no método GET');
    } catch (e) {
      // Fallback para ping POST
      try {
        const testRecord = {
          action: 'ping',
          timestamp: new Date().toISOString()
        };
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testRecord),
          mode: 'no-cors'
        });
        showToast('Web App acessível via POST! Verifique se a ação getResponses está implantada no Code.gs.', 'warning');
        setConnectionStatus(true);
      } catch (err2) {
        showToast('Erro ao alcançar a Web App do Google Apps Script. Verifique a URL e as permissões.', 'error');
        setConnectionStatus(false);
      }
    }
  };

  const checkConnectionStatus = () => {
    setConnectionStatus(!!state.config.apiUrl);
  };

  const setConnectionStatus = (isOnline) => {
    const badge = document.getElementById('connectionBadge');
    if (badge) {
      badge.innerHTML = isOnline 
        ? '<span class="status-dot online"></span><span class="status-text">Sheets Conectado</span>'
        : `<span class="status-dot offline"></span><span class="status-text">${state.config.apiUrl ? 'Sheets Offline' : 'Aguardando URL'}</span>`;

      // No perfil Cidadão (deslogado), o badge permanece oculto
      if (!state.currentUser) {
        badge.style.display = 'none';
      } else {
        badge.style.display = 'flex';
      }
    }
  };

  // --- EXPORTAÇÃO DE DADOS (CSV & BACKUP) ---
  const exportToCSV = () => {
    const data = getFilteredResponses();
    if (data.length === 0) {
      showToast('Nenhum dado para exportar.', 'warning');
      return;
    }

    const headers = [
      'Protocolo', 'Data', 'Hora', 'Nome_Atendente_Servidor', 'Tipo_Servico',
      'Q1_CSAT_Nota', 'Q2_FCR_Resolvido', 'Q3_Clareza_Nota',
      'Q4_Agilidade_Tempo', 'Q5_Comentario', 'Sentimento_NLP', 'Canal'
    ];

    const rows = data.map(r => [
      `"${r.id}"`,
      `"${r.data}"`,
      `"${r.hora}"`,
      `"${r.atendente || r.guiche}"`,
      `"${r.tipo_servico}"`,
      r.q1_csat,
      `"${r.q2_fcr}"`,
      r.q3_clareza,
      `"${r.q4_agilidade}"`,
      `"${(r.q5_comentario || '').replace(/"/g, '""')}"`,
      `"${r.sentimento}"`,
      `"${r.canal || 'Totem'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SJM_DividaAtiva_Satisfacao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Download do CSV para Excel/PowerBI iniciado!', 'success');
  };

  // --- IMPRESSÃO EM PDF DO PAINEL DE KPIS ---
  const updateDashboardPrintHeader = () => {
    const emissionEl = document.getElementById('dashPrintEmissionDate');
    const periodEl = document.getElementById('dashPrintFilterPeriodo');
    const detailsEl = document.getElementById('dashPrintFilterDetails');
    const sampleEl = document.getElementById('dashPrintSampleSize');

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (emissionEl) emissionEl.innerText = dateFormatted;

    const selPeriod = document.getElementById('filterPeriodo');
    const selPeriodText = selPeriod ? selPeriod.options[selPeriod.selectedIndex]?.text : 'Todo o Histórico';
    if (periodEl) periodEl.innerText = selPeriodText;

    const selAtendente = document.getElementById('filterAtendente');
    const atendText = selAtendente ? selAtendente.options[selAtendente.selectedIndex]?.text : 'Todos os Servidores';

    const selServico = document.getElementById('filterServico');
    const servText = selServico ? selServico.options[selServico.selectedIndex]?.text : 'Todos os Assuntos';

    if (detailsEl) detailsEl.innerText = `Atendente: ${atendText} • Assunto: ${servText}`;

    const filtered = getFilteredResponses();
    if (sampleEl) sampleEl.innerText = `${filtered.length} avaliações computadas`;
  };

  const printDashboardPDF = () => {
    if (state.currentView !== 'dashboard') {
      switchView('dashboard');
    }
    updateDashboardPrintHeader();
    window.print();
  };

  const backupJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.responses, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `backup_satisfacao_sjm_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showToast('Backup JSON exportado com sucesso!', 'success');
  };

  // --- MODAL DE QR CODE (RESPONDER NO CELULAR) ---
  const openQRCodeModal = () => {
    const modal = document.getElementById('qrCodeModal');
    const qrImg = document.getElementById('qrCodeImage');
    const linkInput = document.getElementById('directLinkInput');
    
    // Gera link específico com parâmetro para o perfil Cidadão (Totem direto sem menus restritos)
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const citizenUrl = `${baseUrl}?perfil=cidadao`;

    if (linkInput) linkInput.value = citizenUrl;

    if (qrImg) {
      const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(citizenUrl)}`;
      qrImg.src = qrApi;
    }

    if (modal) modal.classList.add('active');
  };

  const closeQRCodeModal = () => {
    const modal = document.getElementById('qrCodeModal');
    if (modal) modal.classList.remove('active');
  };

  const copyDirectLink = () => {
    const linkInput = document.getElementById('directLinkInput');
    if (linkInput) {
      linkInput.select();
      navigator.clipboard.writeText(linkInput.value);
      showToast('Link copiado para a área de transferência!', 'success');
    }
  };

  // --- GESTÃO INSTITUCIONAL DE QR CODE (CONFIGURAÇÃO) ---
  const renderConfigQRCode = () => {
    const qrImg = document.getElementById('configQrCodeImage');
    const linkInput = document.getElementById('configDirectLinkInput');
    if (!qrImg && !linkInput) return;

    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const citizenUrl = `${baseUrl}?perfil=cidadao`;

    if (linkInput) linkInput.value = citizenUrl;
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(citizenUrl)}`;
    }
  };

  const copyConfigDirectLink = () => {
    const linkInput = document.getElementById('configDirectLinkInput');
    if (linkInput) {
      linkInput.select();
      navigator.clipboard.writeText(linkInput.value);
      showToast('Link do perfil Cidadão copiado para a área de transferência!', 'success');
    }
  };

  const downloadQRCode = () => {
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const citizenUrl = `${baseUrl}?perfil=cidadao`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(citizenUrl)}`;

    const link = document.createElement('a');
    link.href = qrApiUrl;
    link.target = '_blank';
    link.download = 'QRCode_Totem_Cidadao_DividaAtiva_SJM.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download do QR Code de alta resolução iniciado!', 'success');
  };

  const printQRCodeSign = () => {
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const citizenUrl = `${baseUrl}?perfil=cidadao`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(citizenUrl)}`;

    const printWin = window.open('', '_blank', 'width=780,height=880');
    if (!printWin) {
      showToast('Por favor, permita popups para imprimir a placa de balcão.', 'warning');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Placa de Balcão - QR Code de Satisfação | PGM São João de Meriti</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 20px;
            text-align: center;
            color: #0f172a;
            background: #ffffff;
          }
          .sign-card {
            border: 3px solid #0284c7;
            border-radius: 16px;
            padding: 32px 24px;
            max-width: 520px;
            margin: 0 auto;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          }
          .logo {
            height: 75px;
            margin-bottom: 10px;
          }
          .prefeitura {
            font-size: 9pt;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .orgao {
            font-family: 'Outfit', sans-serif;
            font-size: 15pt;
            color: #0f172a;
            margin: 3px 0;
            font-weight: 800;
          }
          .setor {
            font-size: 10.5pt;
            color: #0284c7;
            font-weight: 700;
            margin: 0 0 14px 0;
          }
          .divider {
            height: 2px;
            background: #e2e8f0;
            margin: 14px 0 20px 0;
          }
          .callout {
            font-family: 'Outfit', sans-serif;
            font-size: 17pt;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.25;
            margin-bottom: 6px;
          }
          .sub-callout {
            font-size: 10pt;
            color: #475569;
            margin-bottom: 20px;
          }
          .qr-box {
            background: #ffffff;
            border: 2px dashed #0284c7;
            border-radius: 12px;
            padding: 14px;
            display: inline-block;
            margin-bottom: 18px;
          }
          .qr-box img {
            width: 220px;
            height: 220px;
            display: block;
          }
          .instruction {
            font-size: 11pt;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .time-tag {
            display: inline-block;
            background: #f1f5f9;
            color: #0284c7;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 8.5pt;
            font-weight: 700;
            margin-top: 6px;
          }
          .footer {
            margin-top: 22px;
            font-size: 8pt;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="sign-card">
          <img src="logo_sjm.png" alt="Brasão PGM" class="logo">
          <p class="prefeitura">Prefeitura de São João de Meriti</p>
          <h1 class="orgao">Procuradoria Geral do Município</h1>
          <p class="setor">Departamento de Dívida Ativa • Gestão da Qualidade</p>
          
          <div class="divider"></div>

          <div class="callout">Sua opinião é fundamental para nós!</div>
          <div class="sub-callout">Avalie a qualidade do atendimento que você recebeu hoje.</div>

          <div class="qr-box">
            <img src="${qrApiUrl}" alt="QR Code Pesquisa de Satisfação">
          </div>

          <div class="instruction">📷 Aponte a câmera do celular para o QR Code</div>
          <div class="time-tag">⏱️ Leva menos de 1 minuto • 100% Anônimo</div>

          <div class="footer">
            Sistema de Satisfação do Cidadão • Dívida Ativa PGM SJM
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // --- TOAST NOTIFICATIONS ---
  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation" style="color: var(--warning);"></i>',
      error: '<i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i>',
      info: '<i class="fa-solid fa-circle-info" style="color: var(--accent-cyan);"></i>'
    };

    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  const setupEventListeners = () => {
    // Tecla ESC fecha modais
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeQRCodeModal();
        closeLoginModal();
        closeFirstAccessModal();
      }
    });
  };

  // --- EXPOSIÇÃO PÚBLICA ---
  return {
    init,
    toggleTheme,
    switchView,
    validateMetaFields,
    onMetaChange,
    selectCSAT,
    selectFCR,
    selectClarity,
    selectAgility,
    appendQuickTag,
    onCommentInput,
    prevStep,
    nextStep,
    submitSurvey,
    resetSurvey,
    applyFilters,
    filterCommentsFeed,
    searchTable,
    changeTablePage,
    renderServantPerformance,
    filterByServant,
    renderExecutiveReport,
    saveConfig,
    saveGoals,
    testConnection,
    loadDataFromSheets,
    exportToCSV,
    printDashboardPDF,
    backupJSON,
    openQRCodeModal,
    closeQRCodeModal,
    copyDirectLink,
    renderConfigQRCode,
    copyConfigDirectLink,
    downloadQRCode,
    printQRCodeSign,
    openLoginModal,
    closeLoginModal,
    handleLogin,
    logout,
    confirmLogout,
    fillDemoLogin,
    togglePasswordVisibility,
    changeUserPassword,
    registerNewUser,
    deleteUser,
    renderConfigUsersTable,
    updateAuthUI,
    openFirstAccessModal,
    closeFirstAccessModal,
    cancelFirstAccess,
    submitFirstAccessPassword,
    getAttendantsList,
    getServicesList,
    populateDropdowns,
    renderAttendantsTable,
    renderServicesTable,
    addAttendant,
    toggleAttendantStatus,
    deleteAttendant,
    addService,
    toggleServiceStatus,
    deleteService,
    syncCadastrosFromSheets: () => loadCadastrosFromSheets({ silent: false }),
    sendCadastrosToSheets: () => sendCadastrosToSheets({ silent: false }),
    loadCadastrosFromSheets,
    updateCadastrosCloudBadge,
    syncUsersFromSheets: () => loadUsersFromSheets({ silent: false }),
    sendUsersToSheets: () => syncUsersToSheets(state.users),
    loadUsersFromSheets,
    syncUsersToSheets,
    updateUsersCloudBadge
  };

})();

// Inicializa a aplicação ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
