/**
 * CapInterest - Frontend Application Logic
 * Manages UI state, Pinterest feed, web scraping interaction, modals, drag-and-drop, and tab navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentTab: 'feed',
    searchQuery: '',
    selectedCategory: 'all',
    auth: {
      token: localStorage.getItem('capinterest_token') || null,
      username: localStorage.getItem('capinterest_username') || null
    },
    likedItems: [],
    likedItemsObjects: [],
    manualHats: JSON.parse(localStorage.getItem('capinterest_manual_hats') || '[]'),
    scrapedData: [],
    loadedImageUrls: new Set(),
    selectedImageBase64: null,
    currentPage: 1,
    isLoadingNextPage: false,
    hasMore: true,
    defaultHats: [
      {
        id: 'def-1',
        title: 'Cyberpunk Neon Bucket Hat',
        image: 'assets/cyberpunk_bucket.png',
        creator: 'cyber_trends',
        category: 'techwear',
        source: 'AI Generator',
        url: '#',
        tags: ['cyberpunk', 'neon', 'techwear', 'bucket-hat']
      },
      {
        id: 'def-2',
        title: 'Retro Corduroy Dad Hat',
        image: 'assets/retro_corduroy.png',
        creator: 'retro_vintage',
        category: 'dadhat',
        source: 'AI Generator',
        url: '#',
        tags: ['vintage', 'corduroy', 'dadhat', 'mustard']
      },
      {
        id: 'def-3',
        title: 'Sleek Techwear Visor Cap',
        image: 'assets/techwear_visor.png',
        creator: 'future_wear',
        category: 'techwear',
        source: 'AI Generator',
        url: '#',
        tags: ['techwear', 'visor', 'futuristic', 'minimalist']
      },
      {
        id: 'def-4',
        title: 'Futuristic Streetwear Cap',
        image: 'assets/futuristic_streetwear.png',
        creator: 'neo_street',
        category: 'creative',
        source: 'AI Generator',
        url: '#',
        tags: ['streetwear', 'futuristic', 'chrome', 'matte-black']
      },
      {
        id: 'def-5',
        title: 'Chunky Sage Knit Beanie',
        image: 'assets/knit_beanie.png',
        creator: 'cozy_styles',
        category: 'beanie',
        source: 'AI Generator',
        url: '#',
        tags: ['beanie', 'knit', 'wool', 'sage-green']
      }
    ]
  };

  // DOM Selection
  const DOM = {
    // Navigation & Tabs
    feedNavBtn: document.getElementById('feed-nav-btn'),
    ailabNavBtn: document.getElementById('ailab-nav-btn'),
    feedSection: document.getElementById('feed-section'),
    ailabSection: document.getElementById('ailab-section'),
    logoBtn: document.getElementById('logo-btn'),
    
    // Search & Filters
    searchInput: document.getElementById('search-input'),
    searchClearBtn: document.getElementById('search-clear-btn'),
    categoryBar: document.querySelector('.category-bar'),
    scrapeStatus: document.getElementById('scrape-status'),
    scrapeStatusText: document.getElementById('scrape-status-text'),
    pinterestGrid: document.getElementById('pinterest-grid'),
    emptyState: document.getElementById('empty-state'),
    
    // AI Lab Dropzone & Preview
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    dropzonePrompt: document.getElementById('dropzone-prompt'),
    scanViewport: document.getElementById('scan-viewport'),
    scanPreview: document.getElementById('scan-preview'),
    sampleList: document.getElementById('sample-list'),
    startScanBtn: document.getElementById('start-scan-btn'),
    resetScanBtn: document.getElementById('reset-scan-btn'),
    resultPlaceholder: document.getElementById('result-placeholder'),
    resultContent: document.getElementById('result-content'),
    
    // Detail Modal
    detailModal: document.getElementById('detail-modal'),
    closeDetailModal: document.getElementById('close-detail-modal'),
    modalImg: document.getElementById('modal-img'),
    modalCreator: document.getElementById('modal-creator'),
    modalTitle: document.getElementById('modal-title'),
    modalTags: document.getElementById('modal-tags'),
    modalDesc: document.getElementById('modal-desc'),
    modalAnalyzeBtn: document.getElementById('modal-analyze-btn'),
    modalBrainstormBtn: document.getElementById('modal-brainstorm-btn'),
    modalSourceBtn: document.getElementById('modal-source-btn'),
    
    // Settings Modal
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsModal: document.getElementById('close-settings-modal'),
    settingsMode: document.getElementById('settings-mode'),
    apikeyGroup: document.getElementById('apikey-group'),
    apikeyInput: document.getElementById('apikey-input'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),

    // Add Link Modal
    addLinkBtn: document.getElementById('add-link-btn'),
    addLinkModal: document.getElementById('add-link-modal'),
    closeAddLinkModal: document.getElementById('close-add-modal'),
    addUrlInput: document.getElementById('add-url-input'),
    resolveUrlBtn: document.getElementById('resolve-url-btn'),
    resolveStatus: document.getElementById('resolve-status'),
    resolvePreviewContainer: document.getElementById('resolve-preview-container'),
    resolvePreviewImg: document.getElementById('resolve-preview-img'),
    addTitleInput: document.getElementById('add-title-input'),
    addCreatorInput: document.getElementById('add-creator-input'),
    addCategorySelect: document.getElementById('add-category-select'),
    saveAddBtn: document.getElementById('save-add-btn'),
    infiniteLoading: document.getElementById('infinite-loading'),

    // Collection
    collectionNavBtn: document.getElementById('collection-nav-btn'),
    collectionBadge: document.getElementById('collection-badge'),
    collectionSection: document.getElementById('collection-section'),
    collectionGrid: document.getElementById('collection-grid'),
    collectionCount: document.getElementById('collection-count'),
    collectionEmpty: document.getElementById('collection-empty'),
    clearCollectionBtn: document.getElementById('clear-collection-btn'),

    // Mobile Navigation & Badge
    mobileNavBar: document.getElementById('mobile-nav-bar'),
    mobileFeedNavBtn: document.getElementById('mobile-feed-nav-btn'),
    mobileCollectionNavBtn: document.getElementById('mobile-collection-nav-btn'),
    mobileAilabNavBtn: document.getElementById('mobile-ailab-nav-btn'),
    mobileAddLinkBtn: document.getElementById('mobile-add-link-btn'),
    mobileCollectionBadge: document.getElementById('mobile-collection-badge'),

    // Auth Modal & Badge
    authModal: document.getElementById('auth-modal'),
    closeAuthModal: document.getElementById('close-auth-modal'),
    loginTriggerBtn: document.getElementById('login-trigger-btn'),
    userProfileBtn: document.getElementById('user-profile-btn'),
    userUsername: document.getElementById('user-username'),
    logoutBtn: document.getElementById('logout-btn'),
    tabLoginBtn: document.getElementById('tab-login-btn'),
    tabRegisterBtn: document.getElementById('tab-register-btn'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginError: document.getElementById('login-error'),
    registerError: document.getElementById('register-error'),

    // Migration Banner
    migrationBanner: document.getElementById('migration-banner'),
    migrationCount: document.getElementById('migration-count'),
    migrationConfirmBtn: document.getElementById('migration-confirm-btn'),
    migrationCancelBtn: document.getElementById('migration-cancel-btn'),

    // Changelog
    changelogBtn: document.getElementById('changelog-btn'),
    mobileChangelogNavBtn: document.getElementById('mobile-changelog-nav-btn'),
    changelogSection: document.getElementById('changelog-section'),

    // Backup & Restore
    dbBackupBtn: document.getElementById('db-backup-btn'),
    dbRestoreTriggerBtn: document.getElementById('db-restore-trigger-btn'),
    dbRestoreFileInput: document.getElementById('db-restore-file-input'),

    // AI Design Agent Chat Tab Controls and Content
    tabScannerBtn: document.getElementById('ailab-tab-scanner-btn'),
    tabAgentBtn: document.getElementById('ailab-tab-agent-btn'),
    scannerContent: document.getElementById('ailab-scanner-content'),
    agentContent: document.getElementById('ailab-agent-content'),
    agentChatMessages: document.getElementById('agent-chat-messages'),
    agentChatInput: document.getElementById('agent-chat-input'),
    agentSendBtn: document.getElementById('agent-send-btn'),
    likedContextList: document.getElementById('liked-context-list'),
    agentContextCount: document.getElementById('agent-context-count')
  };

  // API Request Helper
  async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (state.auth.token) {
      headers['Authorization'] = `Bearer ${state.auth.token}`;
    }
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    let res = await fetch(endpoint, options);
    
    // Intercept 401/404 for auto-recovery if user was logged in
    if (!res.ok && (res.status === 401 || res.status === 404) && localStorage.getItem('capinterest_recovery_username')) {
      console.warn(`[API] Got ${res.status} error. Attempting silent recovery...`);
      const recovered = await handleAccountAutoRecovery();
      if (recovered) {
        // Retry the API call with the new token
        headers['Authorization'] = `Bearer ${state.auth.token}`;
        res = await fetch(endpoint, options);
      }
    }
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }
    return data;
  }

  // Save credentials for auto-recovery
  function saveRecoveryCredentials(username, password) {
    try {
      localStorage.setItem('capinterest_recovery_username', username);
      localStorage.setItem('capinterest_recovery_password', btoa(password));
    } catch (e) {
      console.error('Failed to save recovery credentials', e);
    }
  }

  // Clear credentials
  function clearRecoveryCredentials() {
    localStorage.removeItem('capinterest_recovery_username');
    localStorage.removeItem('capinterest_recovery_password');
  }

  let isRecovering = false;
  let searchDebounceTimeout = null;

  // Frontend query caching for /api/scrape
  const scrapeCache = {
    memCache: {},
    get(query, page) {
      const cacheKey = `scrape_cache_${query.toLowerCase()}_p${page}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        console.warn('[Cache] sessionStorage read failed:', e);
      }
      if (this.memCache[cacheKey]) {
        return JSON.parse(JSON.stringify(this.memCache[cacheKey]));
      }
      return null;
    },
    set(query, page, data) {
      const cacheKey = `scrape_cache_${query.toLowerCase()}_p${page}`;
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        console.warn('[Cache] sessionStorage write failed:', e);
      }
      this.memCache[cacheKey] = JSON.parse(JSON.stringify(data));
    }
  };

  async function handleAccountAutoRecovery() {
    if (isRecovering) return false;
    const rUsername = localStorage.getItem('capinterest_recovery_username');
    const rPasswordObfuscated = localStorage.getItem('capinterest_recovery_password');
    if (!rUsername || !rPasswordObfuscated) return false;

    isRecovering = true;
    console.log('[Auto-Recovery] Attempting silent recovery for user:', rUsername);
    let rPassword;
    try {
      rPassword = atob(rPasswordObfuscated);
    } catch (e) {
      isRecovering = false;
      return false;
    }

    try {
      // 1. Try to register
      let res;
      try {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: rUsername, password: rPassword })
        }).then(r => r.json());
      } catch (err) {
        console.warn('[Auto-Recovery] Silent register failed, trying login...', err);
      }

      // 2. If register didn't yield success, try login
      if (!res || !res.success) {
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: rUsername, password: rPassword })
        }).then(r => r.json());
      }

      if (res && res.success) {
        console.log('[Auto-Recovery] Silent authentication successful!');
        state.auth.token = res.token;
        state.auth.username = res.username;
        localStorage.setItem('capinterest_token', res.token);
        localStorage.setItem('capinterest_username', res.username);
        updateAuthUI();

        // 3. Restore User Settings (API Key & Mode)
        const savedMode = localStorage.getItem('capinterest_mode') || 'gemini';
        const savedKey = localStorage.getItem('capinterest_apikey') || '';
        try {
          await fetch('/api/user/settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${res.token}`
            },
            body: JSON.stringify({ aiMode: savedMode, apiKey: savedKey })
          });
        } catch (settingsErr) {
          console.error('[Auto-Recovery] Failed to restore settings:', settingsErr);
        }

        // 4. Restore collections backup mirror
        const usernameLower = rUsername.toLowerCase();
        const backupKey = 'capinterest_backup_likes_' + usernameLower;
        const backupLikes = JSON.parse(localStorage.getItem(backupKey) || '[]');
        if (backupLikes.length > 0) {
          try {
            await fetch('/api/collection/migrate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${res.token}`
              },
              body: JSON.stringify({ items: backupLikes })
            });
            console.log(`[Auto-Recovery] Restored ${backupLikes.length} collection items.`);
          } catch (migrateErr) {
            console.error('[Auto-Recovery] Failed to restore collection:', migrateErr);
          }
        }

        showNotification('Đã tự động khôi phục tài khoản và đồng bộ dữ liệu!');
        isRecovering = false;
        return true;
      }
    } catch (recoveryErr) {
      console.error('[Auto-Recovery] Critical failure during recovery:', recoveryErr);
    }

    isRecovering = false;
    return false;
  }

  let pollingInterval = null;

  function startCollectionPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    // Poll immediately, then every 8s
    pollCollection();
    pollingInterval = setInterval(pollCollection, 8000);
  }

  function stopCollectionPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  async function pollCollection() {
    if (!state.auth.token) {
      stopCollectionPolling();
      return;
    }
    try {
      const res = await apiCall('/api/collection');
      if (res.success) {
        const newItemsObjects = res.data || [];
        const newIds = newItemsObjects.map(item => item.id || item.image);
        
        // Compare with local cache
        const cacheIds = state.likedItems;
        const hasChanges = newIds.length !== cacheIds.length || 
                           newIds.some((id, idx) => id !== cacheIds[idx]);
                           
        if (hasChanges) {
          console.log('[Sync] Collection changes detected via polling. Updating...');
          state.likedItemsObjects = newItemsObjects;
          state.likedItems = newIds;
          
          // Sync backup mirror
          if (state.auth.username) {
            const usernameLower = state.auth.username.toLowerCase();
            const backupKey = 'capinterest_backup_likes_' + usernameLower;
            localStorage.setItem(backupKey, JSON.stringify(state.likedItemsObjects));
          }
          
          updateCollectionBadge();
          updateLikeButtonsUI();
          
          if (state.currentTab === 'collection') {
            renderCollection();
          }
        }
      }
    } catch (err) {
      console.warn('[Sync] Collection polling error:', err);
    }
  }

  function updateLikeButtonsUI() {
    const likeButtons = document.querySelectorAll('.like-btn');
    likeButtons.forEach(btn => {
      const id = btn.getAttribute('data-id');
      const isLiked = state.likedItems.includes(id);
      if (isLiked) {
        btn.classList.add('liked');
      } else {
        btn.classList.remove('liked');
      }
    });
  }

  function formatMarkdownToHtml(text) {
    if (!text) return '';
    let html = text;

    // Escaped HTML tags to prevent XSS
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks: ```[lang]\n[code]\n```
    html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>');
    
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers: ### text
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Bullet points: - text or * text
    html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    
    // Group adjacent <li> tags into <ul> tags
    html = html.replace(/(?:<li>.*<\/li>\s*)+/g, (match) => `<ul>${match}</ul>`);

    // Line breaks
    html = html.replace(/\n\n/g, '<p></p>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<p><\/p>/g, '<br><br>');

    return html;
  }

  function renderChatContext() {
    if (!DOM.likedContextList) return;

    const count = state.likedItemsObjects.length;
    if (DOM.agentContextCount) {
      DOM.agentContextCount.textContent = `${count} nón`;
    }

    DOM.likedContextList.innerHTML = '';
    if (count === 0) {
      DOM.likedContextList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.9rem;">
          Chưa có nón yêu thích. Hãy "Thích" nón trên Bản tin để làm dữ liệu thiết kế!
        </div>
      `;
      return;
    }

    state.likedItemsObjects.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'context-thumb-item';
      itemEl.title = `${item.title} by @${item.creator || 'streetwear'}`;
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.title}">
      `;
      DOM.likedContextList.appendChild(itemEl);
    });
  }

  function appendChatMessage(sender, contentHtml) {
    if (!DOM.agentChatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender === 'user' ? 'user-msg' : 'agent-msg'}`;
    msgDiv.innerHTML = `
      <div class="msg-bubble">
        ${contentHtml}
      </div>
    `;

    DOM.agentChatMessages.appendChild(msgDiv);
    DOM.agentChatMessages.scrollTop = DOM.agentChatMessages.scrollHeight;
  }

  // Update Auth Badge in Header
  function updateAuthUI() {
    if (state.auth.token) {
      DOM.loginTriggerBtn.style.display = 'none';
      DOM.userProfileBtn.style.display = 'flex';
      DOM.userUsername.textContent = `@${state.auth.username}`;
      if (DOM.agentChatInput) {
        DOM.agentChatInput.disabled = false;
        DOM.agentChatInput.placeholder = "Mô tả ý tưởng thiết kế nón của bạn ở đây... (Ấn Enter để gửi, Shift+Enter xuống dòng)";
      }
      if (DOM.agentSendBtn) {
        DOM.agentSendBtn.disabled = false;
        DOM.agentSendBtn.classList.add('active');
      }
    } else {
      DOM.loginTriggerBtn.style.display = 'flex';
      DOM.userProfileBtn.style.display = 'none';
      DOM.userUsername.textContent = '';
      if (DOM.agentChatInput) {
        DOM.agentChatInput.disabled = true;
        DOM.agentChatInput.placeholder = "Vui lòng đăng nhập để trò chuyện với AI Design Agent...";
      }
      if (DOM.agentSendBtn) {
        DOM.agentSendBtn.disabled = true;
        DOM.agentSendBtn.classList.remove('active');
      }
    }
  }

  // Sync user settings (AI mode and API key)
  async function syncUserSettings() {
    if (state.auth.token) {
      try {
        const res = await apiCall('/api/user/settings');
        if (res.success) {
          const localMode = localStorage.getItem('capinterest_mode') || 'gemini';
          const localKey = localStorage.getItem('capinterest_apikey') || '';
          
          const serverMode = res.aiMode || 'gemini';
          const serverKey = res.apiKey || '';
          
          if (!serverKey && localKey) {
            // Local key exists but server key doesn't: sync local key to server!
            console.log('[Settings] Syncing local API key to server...');
            await apiCall('/api/user/settings', 'POST', { aiMode: localMode, apiKey: localKey });
          } else {
            // Server key exists (or both empty/set): sync server key to local
            localStorage.setItem('capinterest_mode', serverMode);
            localStorage.setItem('capinterest_apikey', serverKey);
          }
          loadSettings();
        }
      } catch (err) {
        console.error('Failed to sync user settings:', err);
      }
    }
  }

  // Sync collection (server vs local guest)
  async function syncCollection() {
    if (state.auth.token) {
      try {
        const res = await apiCall('/api/collection');
        if (res.success) {
          state.likedItemsObjects = res.data || [];
          state.likedItems = (res.data || []).map(item => item.id || item.image);
          updateCollectionBadge();
          updateLikeButtonsUI();
          if (state.currentTab === 'collection') {
            renderCollection();
          }
 
          // Back up mirror logic
          if (state.auth.username) {
            const usernameLower = state.auth.username.toLowerCase();
            const backupKey = 'capinterest_backup_likes_' + usernameLower;
            const backupLikes = JSON.parse(localStorage.getItem(backupKey) || '[]');
            
            if (state.likedItemsObjects.length === 0 && backupLikes.length > 0) {
              console.log(`[Backup] Server collection is empty, but found client-side backup of ${backupLikes.length} items for ${usernameLower}. Auto-restoring...`);
              try {
                const migrateRes = await apiCall('/api/collection/migrate', 'POST', { items: backupLikes });
                if (migrateRes.success) {
                  showNotification(`Đã tự động khôi phục ${migrateRes.added} nón yêu thích từ bản sao lưu máy khách!`);
                  const freshRes = await apiCall('/api/collection');
                  if (freshRes.success) {
                    state.likedItemsObjects = freshRes.data || [];
                    state.likedItems = (freshRes.data || []).map(item => item.id || item.image);
                    updateCollectionBadge();
                    updateLikeButtonsUI();
                    if (state.currentTab === 'collection') {
                      renderCollection();
                    }
                  }
                }
              } catch (migrateErr) {
                console.error('[Backup] Failed to auto-restore collection:', migrateErr);
              }
            } else {
              // Store current collection to backup mirror
              localStorage.setItem(backupKey, JSON.stringify(state.likedItemsObjects));
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync collection with server:', err);
      }
    } else {
      // Guest local storage
      state.likedItems = JSON.parse(localStorage.getItem('capinterest_likes') || '[]');
      state.likedItemsObjects = JSON.parse(localStorage.getItem('capinterest_likes_objects') || '[]');
      updateCollectionBadge();
      updateLikeButtonsUI();
      if (state.currentTab === 'collection') {
        renderCollection();
      }
    }
  }

  // Check if there is guest data to migrate
  function checkMigrationAfterLogin() {
    if (!state.auth.token) {
      DOM.migrationBanner.style.display = 'none';
      return;
    }
    const localLikes = JSON.parse(localStorage.getItem('capinterest_likes_objects') || '[]');
    if (localLikes.length > 0) {
      DOM.migrationCount.textContent = localLikes.length;
      DOM.migrationBanner.style.display = 'flex';
    } else {
      DOM.migrationBanner.style.display = 'none';
    }
  }

  // Initialize
  async function init() {
    registerEventListeners();
    loadSettings();
    renderSampleThumbnails();
    
    // Add default and manual hats to seen urls to prevent duplicates
    state.defaultHats.forEach(h => state.loadedImageUrls.add(h.image));
    state.manualHats.forEach(h => state.loadedImageUrls.add(h.image));
    
    // Set initial Auth UI state
    updateAuthUI();
    
    // Sync settings
    await syncUserSettings();
    
    // Load and sync collection
    await syncCollection();
    
    // Start polling collection if authenticated
    if (state.auth.token) {
      startCollectionPolling();
    }
    
    // Check migration
    checkMigrationAfterLogin();
    
    // Initial fetch for cap feed
    fetchScrapedHats('trendy caps');
  }

  // Helper to get active query or randomized home feed query on refresh/load
  function getActiveQuery(isRefresh = false) {
    if (state.searchQuery) {
      return state.searchQuery + (state.selectedCategory !== 'all' ? ' ' + state.selectedCategory : '');
    }
    
    if (state.selectedCategory !== 'all') {
      return `${state.selectedCategory} headwear`;
    }
    
    // Default home feed: choose a random query on refresh so it feels like a real Pinterest home feed
    const defaultQueries = [
      'trendy caps',
      'hypebeast caps',
      'streetwear headwear',
      'unique hats fashion',
      'cool caps designs',
      'designer hats pinterest',
      'futuristic cap design',
      'stylish bucket hats',
      'vintage caps aesthetic'
    ];
    
    if (isRefresh) {
      const randIdx = Math.floor(Math.random() * defaultQueries.length);
      return defaultQueries[randIdx];
    }
    
    return 'trendy caps';
  }

  // 1. Navigation & Tabs
  function switchTab(tabName) {
    const prevTab = state.currentTab;
    state.currentTab = tabName;
    
    // Deactivate all nav buttons and sections
    DOM.feedNavBtn.classList.remove('active');
    DOM.collectionNavBtn.classList.remove('active');
    DOM.ailabNavBtn.classList.remove('active');
    if (DOM.changelogBtn) DOM.changelogBtn.classList.remove('active');
    
    if (DOM.mobileFeedNavBtn) DOM.mobileFeedNavBtn.classList.remove('active');
    if (DOM.mobileCollectionNavBtn) DOM.mobileCollectionNavBtn.classList.remove('active');
    if (DOM.mobileAilabNavBtn) DOM.mobileAilabNavBtn.classList.remove('active');
    if (DOM.mobileChangelogNavBtn) DOM.mobileChangelogNavBtn.classList.remove('active');

    DOM.feedSection.classList.remove('active');
    DOM.collectionSection.classList.remove('active');
    DOM.ailabSection.classList.remove('active');
    if (DOM.changelogSection) DOM.changelogSection.classList.remove('active');
    
    // Show category bar only on feed tab
    DOM.categoryBar.style.display = (tabName === 'feed') ? '' : 'none';
    
    if (tabName === 'feed') {
      DOM.feedNavBtn.classList.add('active');
      if (DOM.mobileFeedNavBtn) DOM.mobileFeedNavBtn.classList.add('active');
      DOM.feedSection.classList.add('active');
      
      // If we switched to feed from another tab, refresh
      if (prevTab !== 'feed') {
        const query = getActiveQuery(true);
        fetchScrapedHats(query);
      } else {
        // Ensure infinite scroll can continue
        state.hasMore = true;
        setTimeout(checkScrollHeight, 100);
      }
    } else if (tabName === 'collection') {
      DOM.collectionNavBtn.classList.add('active');
      if (DOM.mobileCollectionNavBtn) DOM.mobileCollectionNavBtn.classList.add('active');
      DOM.collectionSection.classList.add('active');
      renderCollection();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabName === 'ailab') {
      DOM.ailabNavBtn.classList.add('active');
      if (DOM.mobileAilabNavBtn) DOM.mobileAilabNavBtn.classList.add('active');
      DOM.ailabSection.classList.add('active');
      
      // Auto-initialize analyzer elements
      AIAnalyzer.init();
    } else if (tabName === 'changelog') {
      if (DOM.changelogBtn) DOM.changelogBtn.classList.add('active');
      if (DOM.mobileChangelogNavBtn) DOM.mobileChangelogNavBtn.classList.add('active');
      if (DOM.changelogSection) DOM.changelogSection.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // 2. Settings Modal logic
  function loadSettings() {
    if (localStorage.getItem('capinterest_mode') === 'demo') {
      localStorage.setItem('capinterest_mode', 'gemini');
    }
    const configMode = localStorage.getItem('capinterest_mode') || 'gemini';
    const apiKey = localStorage.getItem('capinterest_apikey') || '';
    
    DOM.settingsMode.value = configMode;
    DOM.apikeyInput.value = apiKey;
    
    if (configMode === 'gemini') {
      DOM.apikeyGroup.style.display = '';
    } else {
      DOM.apikeyGroup.style.display = 'none';
    }
  }

  async function saveSettings() {
    const mode = DOM.settingsMode.value;
    const key = DOM.apikeyInput.value.trim();
    
    localStorage.setItem('capinterest_mode', mode);
    localStorage.setItem('capinterest_apikey', key);
    
    if (state.auth.token) {
      try {
        DOM.saveSettingsBtn.disabled = true;
        DOM.saveSettingsBtn.textContent = 'Đang lưu...';
        await apiCall('/api/user/settings', 'POST', { aiMode: mode, apiKey: key });
      } catch (err) {
        console.error('Lỗi khi lưu cấu hình lên tài khoản:', err);
        showNotification('Lỗi khi lưu cấu hình lên tài khoản. Cấu hình đã được lưu tạm trên máy này.');
      } finally {
        DOM.saveSettingsBtn.disabled = false;
        DOM.saveSettingsBtn.textContent = 'Lưu cấu hình';
      }
    }
    
    DOM.settingsModal.classList.remove('active');
    
    // Visual Notification
    showNotification('Đã lưu cấu hình AI!');
  }

  function showNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'status-indicator';
    toast.style.position = 'fixed';
    if (window.innerWidth <= 768) {
      toast.style.bottom = 'calc(80px + env(safe-area-inset-bottom))';
    } else {
      toast.style.bottom = '20px';
    }
    toast.style.right = '20px';
    toast.style.zIndex = '1000';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.style.margin = '0';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" style="color:var(--accent-cyan);"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 2500);
  }

  // 3. Web Scraping & Feed Rendering
  async function fetchScrapedHats(query, page = 1, append = false) {
    if (append) {
      state.isLoadingNextPage = true;
      if (DOM.infiniteLoading) DOM.infiniteLoading.style.display = 'flex';
    } else {
      DOM.scrapeStatus.style.display = 'flex';
      DOM.scrapeStatusText.textContent = `Đang tìm kiếm nón thiết kế độc lạ: "${query}"...`;
      DOM.pinterestGrid.innerHTML = '';
      DOM.emptyState.style.display = 'none';
      state.currentPage = 1;
      state.hasMore = true;
      
      // Reset seen image URLs, keeping defaults and manual hats
      state.loadedImageUrls.clear();
      state.defaultHats.forEach(h => state.loadedImageUrls.add(h.image));
      state.manualHats.forEach(h => state.loadedImageUrls.add(h.image));
    }

    try {
      let result = scrapeCache.get(query, page);
      if (!result) {
        console.log(`[Cache Miss] Fetching results from API for query: "${query}", page: ${page}`);
        const response = await fetch(`/api/scrape?query=${encodeURIComponent(query)}&page=${page}&_t=${Date.now()}`);
        result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Cào ảnh thất bại');
        }
        scrapeCache.set(query, page, result);
      } else {
        console.log(`[Cache Hit] Using cached results for query: "${query}", page: ${page}`);
      }

      // Map and filter out duplicates using state.loadedImageUrls
      const newItems = [];
      (result.data || []).forEach(item => {
        if (!item.image || state.loadedImageUrls.has(item.image)) return;
        state.loadedImageUrls.add(item.image);
        
        let itemCat = 'trendy';
        const textToTest = `${item.title} ${query}`.toLowerCase();
        if (textToTest.includes('snapback')) itemCat = 'snapback';
        else if (textToTest.includes('beanie')) itemCat = 'beanie';
        else if (textToTest.includes('bucket')) itemCat = 'bucket';
        else if (textToTest.includes('techwear') || textToTest.includes('visor')) itemCat = 'techwear';
        else if (textToTest.includes('dad') || textToTest.includes('vintage') || textToTest.includes('corduroy')) itemCat = 'dadhat';
        else if (textToTest.includes('creative') || textToTest.includes('crazy') || textToTest.includes('weird')) itemCat = 'creative';
        
        newItems.push({
          ...item,
          category: itemCat,
          id: item.id || `scr-${Math.random().toString(36).substr(2, 9)}`
        });
      });

      // Check raw API results vs filtered results
      const rawCount = (result.data || []).length;

      if (rawCount === 0) {
        // API truly has no more results
        state.hasMore = false;
      } else if (newItems.length === 0 && rawCount > 0) {
        // All results were duplicates — skip this page and try next automatically
        console.log(`Page ${page}: all ${rawCount} results were duplicates, auto-loading next page...`);
        state.currentPage++;
        if (state.currentPage <= 50) { // safety limit
          setTimeout(() => fetchScrapedHats(query, state.currentPage, append), 200);
          return;
        } else {
          state.hasMore = false;
        }
      }

      if (append) {
        state.scrapedData = [...state.scrapedData, ...newItems];
        if (newItems.length > 0) {
          renderGrid(newItems, true);
        }
      } else {
        state.scrapedData = newItems;
        
        // Blend manual hats, default assets, and scraped data
        let displayData = [];
        const filteredManuals = state.manualHats.filter(h => 
          state.selectedCategory === 'all' || h.category === state.selectedCategory
        );
        
        if (state.selectedCategory === 'all' && query === 'trendy caps') {
          // Inject manual hats + default high-res items at the top
          displayData = [...filteredManuals, ...state.defaultHats, ...state.scrapedData];
        } else {
          // Filter default items if category is selected
          const filteredDefaults = state.defaultHats.filter(h => 
            state.selectedCategory === 'all' || h.category === state.selectedCategory
          );
          displayData = [...filteredManuals, ...filteredDefaults, ...state.scrapedData];
        }

        if (displayData.length === 0) {
          DOM.emptyState.style.display = 'flex';
        } else {
          renderGrid(displayData, false);
        }
      }

    } catch (error) {
      console.error('Error fetching hats:', error);
      if (!append) {
        // Fallback: Display manual + default images on error
        const filteredManuals = state.manualHats.filter(h => 
          state.selectedCategory === 'all' || h.category === state.selectedCategory
        );
        const filteredDefaults = state.defaultHats.filter(h => 
          state.selectedCategory === 'all' || h.category === state.selectedCategory
        );
        renderGrid([...filteredManuals, ...filteredDefaults], false);
        showNotification('Đã hiển thị bộ sưu tập nón có sẵn.');
      }
    } finally {
      if (append) {
        state.isLoadingNextPage = false;
        if (DOM.infiniteLoading) DOM.infiniteLoading.style.display = 'none';
      } else {
        DOM.scrapeStatus.style.display = 'none';
      }
      
      // Auto-trigger load if viewport is not full and we have more items
      if (state.currentTab === 'feed') {
        setTimeout(checkScrollHeight, 300);
      }
    }
  }

  function renderGrid(items, append = false) {
    if (!append) {
      DOM.pinterestGrid.innerHTML = '';
    }
    
    const currentCardCount = DOM.pinterestGrid.childElementCount;

    items.forEach((item, index) => {
      const isLiked = state.likedItems.includes(item.id || item.image);
      
      const card = document.createElement('div');
      card.className = 'cap-card';
      card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=60'; this.classList.add('img-fallback');">
        <div class="cap-card-overlay">
          <div class="overlay-top">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${item.id || item.image}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </div>
          <div class="overlay-bottom">
            <h4 class="overlay-title">${item.title}</h4>
            <div class="overlay-meta">
              <span>@${item.creator || 'streetwear'}</span>
              <button class="card-btn" data-action="analyze">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>
                Quét AI
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listener for opening detail modal on card click (except when clicking buttons)
      card.addEventListener('click', (e) => {
        if (e.target.closest('.like-btn') || e.target.closest('.card-btn')) return;
        openDetailModal(item);
      });

      // Like Button Event
      const likeBtn = card.querySelector('.like-btn');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(item, likeBtn);
      });

      // Analyze Button Event
      const analyzeBtn = card.querySelector('.card-btn');
      analyzeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sendImageToAiLab(item.image);
      });

      DOM.pinterestGrid.appendChild(card);
    });
  }

  async function toggleLike(item, btnElement) {
    const itemId = item.id || item.image;
    const idx = state.likedItems.indexOf(itemId);
    
    if (state.auth.token) {
      if (idx > -1) {
        try {
          btnElement.disabled = true;
          await apiCall('/api/collection/remove', 'DELETE', { itemId });
          state.likedItems.splice(idx, 1);
          btnElement.classList.remove('liked');
          state.likedItemsObjects = state.likedItemsObjects.filter(o => (o.id || o.image) !== itemId);
          showNotification('Đã bỏ lưu nón.');
        } catch (err) {
          console.error(err);
          showNotification('Lỗi khi bỏ lưu nón.');
        } finally {
          btnElement.disabled = false;
        }
      } else {
        try {
          btnElement.disabled = true;
          await apiCall('/api/collection/add', 'POST', { item });
          state.likedItems.push(itemId);
          btnElement.classList.add('liked');
          state.likedItemsObjects.push(item);
          showNotification('Đã lưu vào bộ sưu tập nón yêu thích!');
        } catch (err) {
          console.error(err);
          showNotification('Lỗi khi lưu nón.');
        } finally {
          btnElement.disabled = false;
        }
      }
      if (state.auth.username) {
        localStorage.setItem('capinterest_backup_likes_' + state.auth.username.toLowerCase(), JSON.stringify(state.likedItemsObjects));
      }
    } else {
      if (idx > -1) {
        state.likedItems.splice(idx, 1);
        btnElement.classList.remove('liked');
        state.likedItemsObjects = state.likedItemsObjects.filter(o => (o.id || o.image) !== itemId);
        showNotification('Đã bỏ lưu nón.');
      } else {
        state.likedItems.push(itemId);
        btnElement.classList.add('liked');
        state.likedItemsObjects.push(item);
        showNotification('Đã lưu vào bộ sưu tập nón yêu thích!');
      }
      localStorage.setItem('capinterest_likes', JSON.stringify(state.likedItems));
      localStorage.setItem('capinterest_likes_objects', JSON.stringify(state.likedItemsObjects));
    }
    
    updateCollectionBadge();
    updateLikeButtonsUI();
    
    if (state.currentTab === 'collection') {
      renderCollection();
    }
  }

  function updateCollectionBadge() {
    const count = state.likedItemsObjects.length;
    if (DOM.collectionBadge) {
      if (count > 0) {
        DOM.collectionBadge.textContent = count > 99 ? '99+' : count;
        DOM.collectionBadge.style.display = 'inline-flex';
      } else {
        DOM.collectionBadge.style.display = 'none';
      }
    }
    if (DOM.mobileCollectionBadge) {
      if (count > 0) {
        DOM.mobileCollectionBadge.textContent = count > 99 ? '99+' : count;
        DOM.mobileCollectionBadge.style.display = 'inline-flex';
      } else {
        DOM.mobileCollectionBadge.style.display = 'none';
      }
    }
  }

  function renderCollection() {
    const items = state.likedItemsObjects;
    const grid = DOM.collectionGrid;
    const emptyState = DOM.collectionEmpty;
    const clearBtn = DOM.clearCollectionBtn;
    
    // Update count
    DOM.collectionCount.textContent = `${items.length} mẫu nón`;
    
    if (items.length === 0) {
      grid.innerHTML = '';
      emptyState.style.display = 'flex';
      clearBtn.style.display = 'none';
      return;
    }
    
    emptyState.style.display = 'none';
    clearBtn.style.display = 'inline-flex';
    grid.innerHTML = '';
    
    items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'cap-card';
      
      card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=60'; this.classList.add('img-fallback');">
        <div class="cap-card-overlay">
          <div class="overlay-top">
            <button class="like-btn liked" data-id="${item.id || item.image}" title="Bỏ lưu">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </div>
          <div class="overlay-bottom">
            <h4 class="overlay-title">${item.title || 'Nón yêu thích'}</h4>
            <div class="overlay-meta">
              <span>@${item.creator || item.source || 'streetwear'}</span>
              <button class="card-btn" data-action="analyze">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>
                Quét AI
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Event listener for opening detail modal on card click (except when clicking buttons)
      card.addEventListener('click', (e) => {
        if (e.target.closest('.like-btn') || e.target.closest('.card-btn')) return;
        openDetailModal(item);
      });
      
      // Unlike handler
      const likeBtn = card.querySelector('.like-btn');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(item, likeBtn);
      });
      
      // Analyze handler
      const analyzeBtn = card.querySelector('.card-btn');
      analyzeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        switchTab('ailab');
        DOM.dropzonePrompt.style.display = 'none';
        DOM.scanViewport.style.display = 'flex';
        DOM.scanPreview.src = item.image;
        DOM.startScanBtn.disabled = false;
        DOM.startScanBtn.classList.add('active');
        DOM.resetScanBtn.style.display = 'block';
        
        // Set image for analysis
        state.selectedImageBase64 = item.image;
        
        DOM.resultPlaceholder.style.display = 'flex';
        DOM.resultContent.style.display = 'none';
      });
      
      grid.appendChild(card);
    });
  }

  function getFavoriteCategories() {
    const counts = {};
    state.likedItemsObjects.forEach(item => {
      if (item && item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }

  async function loadNextPage() {
    state.currentPage++;
    
    let query = 'trendy caps';
    
    if (state.searchQuery) {
      query = state.searchQuery + (state.selectedCategory !== 'all' ? ' ' + state.selectedCategory : '');
    } else if (state.selectedCategory !== 'all') {
      query = `${state.selectedCategory} headwear`;
    } else {
      // DEFAULT HOME FEED: Personalize the next page based on user likes!
      const favorites = getFavoriteCategories();
      if (favorites.length > 0) {
        // Rotate favorite categories
        const favIndex = (state.currentPage - 2) % favorites.length;
        const targetFavCategory = favorites[favIndex];
        query = `${targetFavCategory} headwear`;
        console.log(`Personalizing feed: Loading page ${state.currentPage} with favorite category "${targetFavCategory}"`);
      } else {
        // Fallback: alternate between standard categories
        const standardCats = ['snapback', 'beanie', 'bucket', 'dadhat', 'techwear', 'creative'];
        const catIndex = (state.currentPage - 2) % standardCats.length;
        const targetCat = standardCats[catIndex];
        query = `${targetCat} headwear`;
        console.log(`Fallback page: Loading page ${state.currentPage} with default category "${targetCat}"`);
      }
    }

    await fetchScrapedHats(query, state.currentPage, true);
  }

  function checkScrollHeight() {
    if (state.currentTab !== 'feed' || state.isLoadingNextPage || !state.hasMore) return;
    
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = window.innerHeight;
    
    // Check if total scroll height is too close to window height (meaning scrollbar is missing or short)
    if (scrollHeight <= clientHeight + 400) {
      console.log('Viewport height is low, auto-loading next page to ensure continuous scrolling...');
      loadNextPage();
    }
  }

  // 4. Detail Modal Handling
  function openDetailModal(item) {
    DOM.modalImg.src = item.image;
    DOM.modalTitle.textContent = item.title;
    DOM.modalCreator.textContent = `@${item.creator || 'fashion_source'}`;
    DOM.modalSourceBtn.href = item.url && item.url !== '#' ? item.url : item.image;
    
    // Clear & Render Tags
    DOM.modalTags.innerHTML = '';
    const tags = item.tags || ['nón-mũ', 'headwear', 'trendy', 'thiết-kế'];
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = `#${tag}`;
      DOM.modalTags.appendChild(span);
    });

    DOM.modalDesc.textContent = item.title + ' - Kiểu nón thời trang hiện đại được nhiều nhà thiết kế săn đón.';

    // Setup action button inside modal
    DOM.modalAnalyzeBtn.onclick = () => {
      DOM.detailModal.classList.remove('active');
      sendImageToAiLab(item.image);
    };

    if (DOM.modalBrainstormBtn) {
      DOM.modalBrainstormBtn.onclick = () => {
        DOM.detailModal.classList.remove('active');
        if (!state.auth.token) {
          showNotification('Vui lòng đăng nhập để trò chuyện với AI Design Agent!');
          DOM.loginTriggerBtn.click();
          return;
        }
        
        // Switch tab to AI Lab
        switchTab('ailab');
        
        // Toggle the sub-tab to Design Agent Chat
        if (DOM.tabAgentBtn) {
          DOM.tabAgentBtn.click();
        }
        
        // Populate and focus prompt input
        if (DOM.agentChatInput) {
          DOM.agentChatInput.value = `Hãy brainstorm và gợi ý thiết kế mới lấy cảm hứng từ mẫu nón "${item.title}" của @${item.creator || 'fashion_source'} mà tôi đang xem.`;
          DOM.agentChatInput.style.height = 'auto';
          DOM.agentChatInput.style.height = DOM.agentChatInput.scrollHeight + 'px';
          setTimeout(() => DOM.agentChatInput.focus(), 150);
        }
      };
    }

    DOM.detailModal.classList.add('active');
  }

  // Helper to convert Image URL to Base64
  async function imageUrlToBase64(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Failed to fetch image directly for base64 conversion. Reverting to original source URL.", e);
      return url; // fallback to sending the original URL if fetch fails (CORS issues on external URLs)
    }
  }

  // Send an image directly to AI Lab & trigger scan
  async function sendImageToAiLab(imageSrc) {
    switchTab('ailab');
    
    // Reset results layout
    DOM.resultPlaceholder.style.display = 'flex';
    DOM.resultContent.style.display = 'none';
    
    // Load image into scan viewport
    DOM.dropzonePrompt.style.display = 'none';
    DOM.scanViewport.style.display = 'flex';
    DOM.scanPreview.src = imageSrc;
    DOM.startScanBtn.disabled = false;
    DOM.startScanBtn.classList.add('active');
    DOM.resetScanBtn.style.display = 'block';

    // Clear active sample thumbnail selections
    document.querySelectorAll('.sample-thumb').forEach(thumb => thumb.classList.remove('active'));

    // Handle URL vs Base64 conversion
    if (imageSrc.startsWith('data:image')) {
      state.selectedImageBase64 = imageSrc;
    } else {
      // Show loading scanner text immediately
      state.selectedImageBase64 = null;
      // Convert to base64 in background
      state.selectedImageBase64 = await imageUrlToBase64(imageSrc);
    }
  }

  // 5. AI Lab Logic (Upload & Samples)
  function renderSampleThumbnails() {
    DOM.sampleList.innerHTML = '';
    state.defaultHats.forEach(hat => {
      const thumb = document.createElement('div');
      thumb.className = 'sample-thumb';
      thumb.innerHTML = `<img src="${hat.image}" alt="${hat.title}">`;
      
      thumb.addEventListener('click', async () => {
        // Highlight active sample
        document.querySelectorAll('.sample-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');

        // Load preview
        DOM.dropzonePrompt.style.display = 'none';
        DOM.scanViewport.style.display = 'flex';
        DOM.scanPreview.src = hat.image;
        DOM.startScanBtn.disabled = false;
        DOM.startScanBtn.classList.add('active');
        DOM.resetScanBtn.style.display = 'block';

        // Convert sample image URL to base64
        state.selectedImageBase64 = await imageUrlToBase64(hat.image);
        
        // Reset results panel
        DOM.resultPlaceholder.style.display = 'flex';
        DOM.resultContent.style.display = 'none';
      });
      DOM.sampleList.appendChild(thumb);
    });
  }

  // Setup Event Listeners
  function registerEventListeners() {
    // Infinite Scroll scroll handler
    window.addEventListener('scroll', () => {
      if (state.currentTab !== 'feed' || state.isLoadingNextPage || !state.hasMore) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const threshold = 800; // Load when user is within 800px of the bottom (larger threshold for continuous feel)

      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        loadNextPage();
      }
    });

    // Navigation Tabs
    DOM.feedNavBtn.addEventListener('click', () => {
      if (state.currentTab === 'feed') {
        // Smooth scroll to top and refresh
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const query = getActiveQuery(true);
        fetchScrapedHats(query);
      } else {
        switchTab('feed');
      }
    });
    DOM.collectionNavBtn.addEventListener('click', () => switchTab('collection'));
    DOM.ailabNavBtn.addEventListener('click', () => switchTab('ailab'));
    if (DOM.changelogBtn) {
      DOM.changelogBtn.addEventListener('click', () => switchTab('changelog'));
    }

    // Mobile Navigation Tabs
    if (DOM.mobileFeedNavBtn) {
      DOM.mobileFeedNavBtn.addEventListener('click', () => {
        if (state.currentTab === 'feed') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          const query = getActiveQuery(true);
          fetchScrapedHats(query);
        } else {
          switchTab('feed');
        }
      });
    }
    if (DOM.mobileCollectionNavBtn) {
      DOM.mobileCollectionNavBtn.addEventListener('click', () => switchTab('collection'));
    }
    if (DOM.mobileAilabNavBtn) {
      DOM.mobileAilabNavBtn.addEventListener('click', () => switchTab('ailab'));
    }
    if (DOM.mobileChangelogNavBtn) {
      DOM.mobileChangelogNavBtn.addEventListener('click', () => switchTab('changelog'));
    }
    if (DOM.mobileAddLinkBtn && DOM.addLinkBtn) {
      DOM.mobileAddLinkBtn.addEventListener('click', () => DOM.addLinkBtn.click());
    }

    // Clear all collection
    DOM.clearCollectionBtn.addEventListener('click', async () => {
      if (confirm('Bạn có chắc muốn xóa toàn bộ bộ sưu tập?')) {
        if (state.auth.token) {
          try {
            // Delete all items one by one on the server
            const promises = state.likedItems.map(itemId => 
              apiCall('/api/collection/remove', 'DELETE', { itemId }).catch(() => {})
            );
            await Promise.all(promises);
            await syncCollection();
            showNotification('Đã xóa toàn bộ bộ sưu tập.');
          } catch (err) {
            showNotification('Không thể xóa bộ sưu tập trên server.');
          }
        } else {
          state.likedItems = [];
          state.likedItemsObjects = [];
          localStorage.setItem('capinterest_likes', '[]');
          localStorage.setItem('capinterest_likes_objects', '[]');
          updateCollectionBadge();
          renderCollection();
          showNotification('Đã xóa toàn bộ bộ sưu tập.');
        }
      }
    });

    // ─── Authentication Event Listeners ──────────────────────────────────────
    
    // Open Auth Modal
    if (DOM.loginTriggerBtn) {
      DOM.loginTriggerBtn.addEventListener('click', () => {
        DOM.authModal.classList.add('active');
        DOM.loginError.style.display = 'none';
        DOM.registerError.style.display = 'none';
        DOM.loginForm.reset();
        DOM.registerForm.reset();
        DOM.tabLoginBtn.click();
      });
    }

    // Close Auth Modal
    if (DOM.closeAuthModal) {
      DOM.closeAuthModal.addEventListener('click', () => {
        DOM.authModal.classList.remove('active');
      });
    }

    // Toggle Login/Register Tabs
    if (DOM.tabLoginBtn && DOM.tabRegisterBtn) {
      DOM.tabLoginBtn.addEventListener('click', () => {
        DOM.tabLoginBtn.classList.add('active');
        DOM.tabRegisterBtn.classList.remove('active');
        DOM.loginForm.classList.add('active');
        DOM.registerForm.classList.remove('active');
      });

      DOM.tabRegisterBtn.addEventListener('click', () => {
        DOM.tabRegisterBtn.classList.add('active');
        DOM.tabLoginBtn.classList.remove('active');
        DOM.registerForm.classList.add('active');
        DOM.loginForm.classList.remove('active');
      });
    }

    // Submit Login Form
    if (DOM.loginForm) {
      DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        DOM.loginError.style.display = 'none';
        
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const submitBtn = document.getElementById('login-submit-btn');

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Đang đăng nhập...';

          const res = await apiCall('/api/auth/login', 'POST', { username, password });
          if (res.success) {
            state.auth.token = res.token;
            state.auth.username = res.username;
            localStorage.setItem('capinterest_token', res.token);
            localStorage.setItem('capinterest_username', res.username);
            saveRecoveryCredentials(username, password);
            
            DOM.authModal.classList.remove('active');
            
            updateAuthUI();
            await syncUserSettings();
            await syncCollection();
            startCollectionPolling();
            checkMigrationAfterLogin();
            showNotification(`Chào mừng quay trở lại, @${res.username}!`);
          }
        } catch (err) {
          DOM.loginError.textContent = err.message;
          DOM.loginError.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng nhập';
        }
      });
    }

    // Submit Register Form
    if (DOM.registerForm) {
      DOM.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        DOM.registerError.style.display = 'none';

        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const submitBtn = document.getElementById('register-submit-btn');

        if (password !== confirmPassword) {
          DOM.registerError.textContent = 'Mật khẩu xác nhận không khớp!';
          DOM.registerError.style.display = 'block';
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Đang đăng ký...';

          const res = await apiCall('/api/auth/register', 'POST', { username, password });
          if (res.success) {
            state.auth.token = res.token;
            state.auth.username = res.username;
            localStorage.setItem('capinterest_token', res.token);
            localStorage.setItem('capinterest_username', res.username);
            saveRecoveryCredentials(username, password);
            
            DOM.authModal.classList.remove('active');
            
            updateAuthUI();
            await syncUserSettings();
            await syncCollection();
            startCollectionPolling();
            checkMigrationAfterLogin();
            showNotification(`Đăng ký tài khoản thành công!`);
          }
        } catch (err) {
          DOM.registerError.textContent = err.message;
          DOM.registerError.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Đăng ký tài khoản';
        }
      });
    }

    // Logout Action
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
          state.auth.token = null;
          state.auth.username = null;
          localStorage.removeItem('capinterest_token');
          localStorage.removeItem('capinterest_username');
          clearRecoveryCredentials();
          
          // Reset settings to Guest default
          localStorage.setItem('capinterest_mode', 'gemini');
          localStorage.setItem('capinterest_apikey', '');
          loadSettings();
          
          updateAuthUI();
          stopCollectionPolling();
          syncCollection();
          
          DOM.migrationBanner.style.display = 'none';
          
          showNotification('Đã đăng xuất tài khoản.');

          if (state.currentTab === 'collection') {
            switchTab('feed');
          }
        }
      });
    }

    // ─── Migration Event Listeners ───────────────────────────────────────────
    
    // Confirm Migration
    if (DOM.migrationConfirmBtn) {
      DOM.migrationConfirmBtn.addEventListener('click', async () => {
        const localLikes = JSON.parse(localStorage.getItem('capinterest_likes_objects') || '[]');
        if (localLikes.length === 0) {
          DOM.migrationBanner.style.display = 'none';
          return;
        }

        try {
          DOM.migrationConfirmBtn.disabled = true;
          DOM.migrationConfirmBtn.textContent = 'Đang đồng bộ...';
          
          const res = await apiCall('/api/collection/migrate', 'POST', { items: localLikes });
          if (res.success) {
            localStorage.removeItem('capinterest_likes');
            localStorage.removeItem('capinterest_likes_objects');
            
            DOM.migrationBanner.style.display = 'none';
            await syncCollection();
            showNotification(`Đã đồng bộ thành công ${res.added} mẫu nón vào tài khoản của bạn!`);
          }
        } catch (err) {
          console.error(err);
          showNotification('Đồng bộ thất bại. Vui lòng thử lại sau.');
        } finally {
          DOM.migrationConfirmBtn.disabled = false;
          DOM.migrationConfirmBtn.textContent = 'Đồng bộ ngay';
        }
      });
    }

    // Cancel Migration
    if (DOM.migrationCancelBtn) {
      DOM.migrationCancelBtn.addEventListener('click', () => {
        DOM.migrationBanner.style.display = 'none';
      });
    }
    DOM.logoBtn.addEventListener('click', () => {
      if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
      switchTab('feed');
      DOM.searchInput.value = '';
      DOM.searchClearBtn.style.display = 'none';
      state.searchQuery = '';
      state.selectedCategory = 'all';
      document.querySelectorAll('.cat-pill').forEach(pill => pill.classList.remove('active'));
      document.querySelector('[data-category="all"]').classList.add('active');
      const query = getActiveQuery(true);
      fetchScrapedHats(query);
    });

    // Search input debouncing
    DOM.searchInput.addEventListener('input', () => {
      const query = DOM.searchInput.value.trim();
      if (query) {
        DOM.searchClearBtn.style.display = 'block';
      } else {
        DOM.searchClearBtn.style.display = 'none';
      }

      if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        state.searchQuery = query;
        let targetQuery = query;
        if (query) {
          if (state.selectedCategory !== 'all') {
            targetQuery = `${query} ${state.selectedCategory}`;
          }
        } else {
          targetQuery = state.selectedCategory === 'all' ? 'trendy caps' : `${state.selectedCategory} headwear`;
        }
        fetchScrapedHats(targetQuery);
      }, 500);
    });

    // Search bar submit
    DOM.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
        const query = DOM.searchInput.value.trim();
        state.searchQuery = query;
        let targetQuery = query;
        if (query) {
          DOM.searchClearBtn.style.display = 'block';
          if (state.selectedCategory !== 'all') {
            targetQuery = `${query} ${state.selectedCategory}`;
          }
        } else {
          DOM.searchClearBtn.style.display = 'none';
          targetQuery = state.selectedCategory === 'all' ? 'trendy caps' : `${state.selectedCategory} headwear`;
        }
        fetchScrapedHats(targetQuery);
      }
    });

    // Search clear button
    DOM.searchClearBtn.addEventListener('click', () => {
      if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
      DOM.searchInput.value = '';
      DOM.searchClearBtn.style.display = 'none';
      state.searchQuery = '';
      fetchScrapedHats(state.selectedCategory === 'all' ? 'trendy caps' : state.selectedCategory + ' headwear');
    });

    // Category Quick Filters
    DOM.categoryBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.cat-pill');
      if (!pill) return;

      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      const category = pill.dataset.category;
      state.selectedCategory = category;
      // Reset pagination and allow further loading
      state.hasMore = true;
      state.currentPage = 1; // will be reset in fetchScrapedHats

      let query = 'trendy caps';
      if (category !== 'all') {
        query = `${category} headwear`;
      }
      
      if (state.searchQuery) {
        query = `${state.searchQuery} ${category !== 'all' ? category : ''}`;
      }

      fetchScrapedHats(query);
    });

    // Settings Modal toggles
    DOM.settingsBtn.addEventListener('click', () => {
      loadSettings();
      DOM.settingsModal.classList.add('active');
    });
    DOM.closeSettingsModal.addEventListener('click', () => {
      DOM.settingsModal.classList.remove('active');
    });
    DOM.settingsMode.addEventListener('change', () => {
      if (DOM.settingsMode.value === 'gemini') {
        DOM.apikeyGroup.style.display = '';
      } else {
        DOM.apikeyGroup.style.display = 'none';
      }
    });
    DOM.saveSettingsBtn.addEventListener('click', saveSettings);

    // Backup & Restore listeners
    if (DOM.dbBackupBtn) {
      DOM.dbBackupBtn.addEventListener('click', async () => {
        if (!state.auth.token) {
          showNotification('Bạn cần đăng nhập để sao lưu hệ thống!');
          return;
        }
        try {
          DOM.dbBackupBtn.disabled = true;
          const originalText = DOM.dbBackupBtn.innerHTML;
          DOM.dbBackupBtn.innerHTML = 'Đang tải...';
          const res = await apiCall('/api/admin/backup');
          if (res.success) {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `capinterest_backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showNotification('Đã tải xuống tệp sao lưu dữ liệu!');
          }
          DOM.dbBackupBtn.innerHTML = originalText;
        } catch (err) {
          console.error(err);
          showNotification('Lỗi khi tải bản sao lưu: ' + err.message);
        } finally {
          DOM.dbBackupBtn.disabled = false;
        }
      });
    }

    if (DOM.dbRestoreTriggerBtn && DOM.dbRestoreFileInput) {
      DOM.dbRestoreTriggerBtn.addEventListener('click', () => {
        if (!state.auth.token) {
          showNotification('Bạn cần đăng nhập để phục hồi hệ thống!');
          return;
        }
        DOM.dbRestoreFileInput.click();
      });

      DOM.dbRestoreFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (!data.users || !data.collections) {
              showNotification('Tệp sao lưu không hợp lệ! Thiếu users hoặc collections.');
              return;
            }

            DOM.dbRestoreTriggerBtn.disabled = true;
            const originalText = DOM.dbRestoreTriggerBtn.innerHTML;
            DOM.dbRestoreTriggerBtn.innerHTML = 'Đang khôi phục...';

            const res = await apiCall('/api/admin/restore', 'POST', data);
            if (res.success) {
              showNotification('Khôi phục dữ liệu hệ thống thành công! Đang đồng bộ lại...');
              await syncUserSettings();
              await syncCollection();
              fetchScrapedHats('trendy caps');
              DOM.settingsModal.classList.remove('active');
            }
            DOM.dbRestoreTriggerBtn.innerHTML = originalText;
          } catch (err) {
            console.error(err);
            showNotification('Khôi phục thất bại: ' + err.message);
          } finally {
            DOM.dbRestoreTriggerBtn.disabled = false;
            DOM.dbRestoreFileInput.value = '';
          }
        };
        reader.readAsText(file);
      });
    }

    // AI Lab Sub-Tab Toggles
    if (DOM.tabScannerBtn && DOM.tabAgentBtn && DOM.scannerContent && DOM.agentContent) {
      DOM.tabScannerBtn.addEventListener('click', () => {
        DOM.tabScannerBtn.classList.add('active');
        DOM.tabAgentBtn.classList.remove('active');
        DOM.scannerContent.classList.add('active');
        DOM.agentContent.classList.remove('active');
      });

      DOM.tabAgentBtn.addEventListener('click', () => {
        DOM.tabAgentBtn.classList.add('active');
        DOM.tabScannerBtn.classList.remove('active');
        DOM.agentContent.classList.add('active');
        DOM.scannerContent.classList.remove('active');
        renderChatContext();
      });
    }

    // AI Design Agent Chat Messages
    if (DOM.agentChatInput && DOM.agentSendBtn && DOM.agentChatMessages) {
      const sendMessage = async () => {
        const promptText = DOM.agentChatInput.value.trim();
        if (!promptText) return;

        appendChatMessage('user', promptText);
        DOM.agentChatInput.value = '';
        DOM.agentChatInput.style.height = 'auto';

        const loadingId = 'loading-' + Date.now();
        appendChatMessage('agent', `
          <div class="loading-dots" id="${loadingId}">
            <span></span><span></span><span></span>
          </div>
        `);

        try {
          const res = await apiCall('/api/design-chat', 'POST', {
            prompt: promptText,
            collection: state.likedItemsObjects,
            apiKey: localStorage.getItem('capinterest_apikey') || ''
          });

          const loadingEl = document.getElementById(loadingId);
          if (loadingEl) {
            const bubbleEl = loadingEl.closest('.msg-bubble');
            if (bubbleEl) {
              bubbleEl.innerHTML = formatMarkdownToHtml(res.reply);
            }
          } else {
            appendChatMessage('agent', formatMarkdownToHtml(res.reply));
          }
        } catch (err) {
          console.error(err);
          const loadingEl = document.getElementById(loadingId);
          if (loadingEl) {
            const bubbleEl = loadingEl.closest('.msg-bubble');
            if (bubbleEl) {
              bubbleEl.innerHTML = `<span style="color:var(--accent-pink);">Lỗi: ${err.message}</span>`;
            }
          } else {
            appendChatMessage('agent', `<span style="color:var(--accent-pink);">Lỗi: Lỗi khi xử lý ý tưởng thiết kế.</span>`);
          }
        }
      };

      DOM.agentSendBtn.addEventListener('click', sendMessage);
      DOM.agentChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // Detail Modal Close
    DOM.closeDetailModal.addEventListener('click', () => {
      DOM.detailModal.classList.remove('active');
    });

    // Add Link Modal toggles
    if (DOM.addLinkBtn) {
      DOM.addLinkBtn.addEventListener('click', () => {
        DOM.addLinkModal.classList.add('active');
        // Reset modal fields
        DOM.addUrlInput.value = '';
        DOM.addTitleInput.value = '';
        DOM.addCreatorInput.value = '';
        DOM.resolveStatus.style.display = 'none';
        DOM.resolvePreviewContainer.style.display = 'none';
        DOM.resolvePreviewImg.src = '';
      });
    }

    if (DOM.closeAddLinkModal) {
      DOM.closeAddLinkModal.addEventListener('click', () => {
        DOM.addLinkModal.classList.remove('active');
      });
    }

    // Resolve URL button click
    if (DOM.resolveUrlBtn) {
      DOM.resolveUrlBtn.addEventListener('click', async () => {
        const url = DOM.addUrlInput.value.trim();
        if (!url) {
          DOM.resolveStatus.style.display = 'block';
          DOM.resolveStatus.style.color = '#ff4a5a';
          DOM.resolveStatus.textContent = 'Vui lòng nhập liên kết trang web hoặc ảnh trước.';
          return;
        }

        DOM.resolveStatus.style.display = 'block';
        DOM.resolveStatus.style.color = 'var(--accent-cyan)';
        DOM.resolveStatus.textContent = 'Đang tự động lấy dữ liệu ảnh...';
        DOM.resolveUrlBtn.disabled = true;

        try {
          const response = await fetch('/api/resolve-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Không thể tự động trích xuất thông tin.');
          }

          const info = result.data;
          DOM.addTitleInput.value = info.title || '';
          DOM.addCreatorInput.value = info.creator || '';
          DOM.resolvePreviewImg.src = info.image;
          DOM.resolvePreviewContainer.style.display = 'block';

          DOM.resolveStatus.style.color = '#39ff14'; // Neon Green
          DOM.resolveStatus.textContent = 'Trích xuất ảnh thành công!';
        } catch (err) {
          console.error('Resolve URL failed:', err);
          DOM.resolveStatus.style.color = '#ff007f'; // Neon Pink
          DOM.resolveStatus.innerHTML = err.message;
        } finally {
          DOM.resolveUrlBtn.disabled = false;
        }
      });
    }

    // Save added Pin
    if (DOM.saveAddBtn) {
      DOM.saveAddBtn.addEventListener('click', async () => {
        const url = DOM.addUrlInput.value.trim();
        const image = DOM.resolvePreviewImg.src || url;

        if (!url) {
          showNotification('Vui lòng điền liên kết nón!');
          return;
        }

        const category = DOM.addCategorySelect.value;
        const title = DOM.addTitleInput.value.trim() || 'Nón liên kết';
        const creator = DOM.addCreatorInput.value.trim() || 'Link trực tiếp';
        const tags = [category, 'user-added', 'headwear'];

        // Show loading spinner/disabled state
        const originalText = DOM.saveAddBtn.textContent;
        DOM.saveAddBtn.disabled = true;
        DOM.saveAddBtn.textContent = 'Đang lưu nón...';

        try {
          // Call Backend API to add & share the hat
          const result = await apiCall('/api/hats/add', 'POST', {
            title,
            image,
            creator,
            category,
            url,
            tags
          });

          if (!result.success) {
            throw new Error(result.error || 'Không thể lưu nón chia sẻ');
          }

          const savedHat = result.data;

          // Add to local state manualHats and save to localStorage
          state.manualHats.unshift(savedHat);
          localStorage.setItem('capinterest_manual_hats', JSON.stringify(state.manualHats));

          // Hide modal and reset inputs
          DOM.addLinkModal.classList.remove('active');
          DOM.addUrlInput.value = '';
          DOM.addTitleInput.value = '';
          DOM.addCreatorInput.value = '';
          DOM.resolvePreviewImg.src = '';
          DOM.resolvePreviewContainer.style.display = 'none';
          DOM.resolveStatus.style.display = 'none';

          showNotification('Đã lưu nón và chia sẻ thành công lên hệ thống!');

          // Refresh grid
          const query = state.searchQuery ? state.searchQuery : (state.selectedCategory === 'all' ? 'trendy caps' : state.selectedCategory + ' headwear');
          fetchScrapedHats(query);

        } catch (err) {
          console.error('[Add Hat] Error:', err);
          showNotification(`Lỗi: ${err.message || 'Không thể lưu nón'}`);
        } finally {
          DOM.saveAddBtn.disabled = false;
          DOM.saveAddBtn.textContent = originalText;
        }
      });
    }
    
    // Close modals on clicking overlay background
    window.addEventListener('click', (e) => {
      if (e.target === DOM.detailModal) DOM.detailModal.classList.remove('active');
      if (e.target === DOM.settingsModal) DOM.settingsModal.classList.remove('active');
      if (e.target === DOM.addLinkModal) DOM.addLinkModal.classList.remove('active');
      if (e.target === DOM.authModal) DOM.authModal.classList.remove('active');
    });

    // File input trigger
    DOM.dropzone.addEventListener('click', (e) => {
      if (e.target.closest('#scan-viewport') || e.target.closest('#reset-scan-btn')) return;
      DOM.fileInput.click();
    });

    // Handle Upload File selection
    DOM.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleUploadedFile(file);
      }
    });

    // Drag and Drop
    DOM.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.dropzone.classList.add('dragover');
    });
    DOM.dropzone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      DOM.dropzone.classList.add('dragover');
    });
    DOM.dropzone.addEventListener('dragleave', () => {
      DOM.dropzone.classList.remove('dragover');
    });
    DOM.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleUploadedFile(file);
      }
    });

    // Reset Scan Viewport
    DOM.resetScanBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetScanViewport();
    });

    // Start Scan triggers AI Analyzer
    DOM.startScanBtn.addEventListener('click', () => {
      if (state.selectedImageBase64) {
        AIAnalyzer.analyze(state.selectedImageBase64);
      } else {
        // Fallback: analyze using current src directly (if URL conversion failed/not needed)
        AIAnalyzer.analyze(DOM.scanPreview.src);
      }
    });

    // Pause/Resume polling on visibility change (active/inactive tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('[Sync] Tab hidden. Pausing collection polling.');
        stopCollectionPolling();
      } else if (document.visibilityState === 'visible') {
        if (state.auth.token) {
          console.log('[Sync] Tab visible. Resuming collection polling.');
          startCollectionPolling();
        }
      }
    });
  }

  function handleUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Src = e.target.result;
      state.selectedImageBase64 = base64Src;

      // Load Preview
      DOM.dropzonePrompt.style.display = 'none';
      DOM.scanViewport.style.display = 'flex';
      DOM.scanPreview.src = base64Src;
      DOM.startScanBtn.disabled = false;
      DOM.startScanBtn.classList.add('active');
      DOM.resetScanBtn.style.display = 'block';

      // Clear sample selections
      document.querySelectorAll('.sample-thumb').forEach(thumb => thumb.classList.remove('active'));
      
      // Reset results panel
      DOM.resultPlaceholder.style.display = 'flex';
      DOM.resultContent.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function resetScanViewport() {
    DOM.fileInput.value = '';
    state.selectedImageBase64 = null;
    DOM.scanViewport.style.display = 'none';
    DOM.dropzonePrompt.style.display = 'flex';
    DOM.startScanBtn.disabled = true;
    DOM.startScanBtn.classList.remove('active');
    DOM.resetScanBtn.style.display = 'none';
    DOM.scanPreview.src = '';
    
    // Clear sample highlights
    document.querySelectorAll('.sample-thumb').forEach(thumb => thumb.classList.remove('active'));

    // Reset results panel
    DOM.resultPlaceholder.innerHTML = `
      <svg viewBox="0 0 24 24" width="64" height="64"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>
      <p>Chưa có dữ liệu phân tích. Hãy tải ảnh lên và nhấn "Quét & Phân Tích Bằng AI" ở cột bên trái.</p>
    `;
    DOM.resultPlaceholder.style.display = 'flex';
    DOM.resultContent.style.display = 'none';
  }

  // Start app
  init();
});
