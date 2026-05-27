/**
 * CapInterest - Frontend Application Logic
 * Manages UI state, Pinterest feed, web scraping interaction, modals, drag-and-drop, and tab navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentTab: 'feed',
    currentFeedItems: [],
    activeModalItem: null,
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
    prefetchBuffer: [],
    prefetchPage: 2,
    isPrefetching: false,
    selectedReferenceId: null,
    lang: localStorage.getItem('capinterest_lang') || 'vi',
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
    ],
    moodboard: {
      nodes: [],
      links: [],
      mode: 'select', // 'select' or 'link'
      panX: 0,
      panY: 0,
      zoom: 1.0,
      draggedNodeId: null,
      isPanning: false,
      linkStartNodeId: null,
      tempLinkEnd: null
    }
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
    modalReportBtn: document.getElementById('modal-report-btn'),
    
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
    infiniteScrollTrigger: document.getElementById('infinite-scroll-trigger'),

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
    agentContextCount: document.getElementById('agent-context-count'),
    settingsLangSelect: document.getElementById('settings-lang-select'),
    chatReferenceContainer: document.getElementById('chat-reference-container'),
    chatReferenceTitle: document.getElementById('chat-reference-title'),
    chatReferenceClear: document.getElementById('chat-reference-clear'),

    // Moodboard DOM elements
    tabMoodboardBtn: document.getElementById('tab-moodboard-btn'),
    moodboardContent: document.getElementById('ailab-moodboard-content'),
    moodboardContextList: document.getElementById('moodboard-context-list'),
    moodboardContextCount: document.getElementById('moodboard-context-count'),
    mbToolSelect: document.getElementById('mb-tool-select'),
    mbToolLink: document.getElementById('mb-tool-link'),
    mbToolZoomIn: document.getElementById('mb-tool-zoom-in'),
    mbToolZoomOut: document.getElementById('mb-tool-zoom-out'),
    mbToolZoomReset: document.getElementById('mb-tool-zoom-reset'),
    mbToolClear: document.getElementById('mb-tool-clear'),
    mbToolAnalyze: document.getElementById('mb-tool-analyze'),
    mbZoomLevel: document.getElementById('mb-zoom-level'),
    moodboardCanvasViewport: document.getElementById('moodboard-canvas-viewport'),
    moodboardCanvas: document.getElementById('moodboard-canvas'),
    moodboardSvgOverlay: document.getElementById('moodboard-svg-overlay'),
    moodboardEmptyMsg: document.getElementById('moodboard-empty-msg')
  };

  const TRANSLATIONS = {
    vi: {
      // Header & Navigation
      logo_sub: "Interest",
      search_placeholder: "Tìm kiếm nón, mũ thời trang (Ví dụ: cyberpunk, vintage dad hat, bucket...)",
      nav_feed: "Bản tin",
      nav_collection: "Bộ sưu tập",
      nav_ailab: "AI Lab",
      nav_changelog: "Nhật ký",
      nav_add_link: "Dán link nón",
      nav_login: "Đăng nhập",
      nav_logout: "Đăng xuất",
      
      // Tooltips & extra keys
      title_add_link: "Thêm nón bằng link ảnh",
      title_logout: "Đăng xuất",
      title_settings: "Cấu hình API Key",
      settings_apikey_placeholder: "Nhập API Key của bạn (AIzaSy...)",
      coll_clear_btn: "Xóa tất cả",
      
      // Category pills
      cat_all: "Tất cả",
      cat_trendy: "Xu hướng",
      cat_snapback: "Snapback",
      cat_bucket: "Nón Bucket",
      cat_beanie: "Beanie len",
      cat_dadhat: "Mũ lưỡi trai cổ điển",
      cat_techwear: "Techwear / Visor",
      cat_creative: "Sáng tạo lạ",
      
      // Settings
      settings_title: "Cài Đặt Cấu Hình AI",
      settings_subtitle: "Nhập API Key lấy từ Google AI Studio để phân tích nón bằng AI (gemini-3.5-flash)",
      settings_lang_label: "Ngôn ngữ giao diện",
      settings_apikey_label: "Google Gemini API Key",
      settings_apikey_help: "Nhận API Key miễn phí tại Google AI Studio. Khóa được lưu trực tiếp trên trình duyệt của bạn (local storage) và được đồng bộ bảo mật lên tài khoản cá nhân.",
      settings_backup_label: "Quản trị hệ thống (Backup & Restore)",
      settings_backup_help: "Sao lưu toàn bộ cơ sở dữ liệu hệ thống (Tài khoản + Bộ sưu tập) về máy tính hoặc nhập lại từ tệp đã lưu.",
      settings_backup_btn: "Tải Backup JSON",
      settings_restore_btn: "Phục hồi JSON",
      settings_save_btn: "Lưu cấu hình",
      
      // AI Lab Tabs
      tab_scanner: "Máy Quét AI (Scanner)",
      tab_agent: "AI Design Agent Chat",
      tab_moodboard: "Bảng ý tưởng (Mood Board)",
      mb_toolbar_select: "Chọn / Di chuyển",
      mb_toolbar_link: "Vẽ liên kết",
      mb_toolbar_clear: "Xóa bảng",
      mb_toolbar_analyze: "Phân tích cụm AI",
      mb_empty_board: "Kéo thả nón từ thanh bên hoặc click vào để thêm vào bảng ý tưởng",
      
      // Scanner
      scanner_title: "Trình Quét Thiết Kế (AI Scanner)",
      scanner_subtitle: "Tải ảnh nón của bạn lên hoặc chọn mẫu để AI tự động phân tích",
      scanner_dropzone_main: "Kéo thả ảnh vào đây hoặc click để duyệt tệp",
      scanner_dropzone_sub: "Hỗ trợ PNG, JPG, JPEG",
      scanner_samples_title: "Hoặc chọn mẫu nón thiết kế sẵn:",
      scanner_btn_scan: "Quét & Phân Tích Bằng AI",
      scanner_btn_reset: "Quét ảnh khác",
      
      // Results
      results_title: "Kết quả Phân Tích Thiết Kế",
      results_subtitle: "Thông tin chi tiết về kiểu dáng, chất liệu, màu sắc và độ hot",
      results_placeholder: "Chưa có dữ liệu phân tích. Hãy tải ảnh lên và nhấn \"Quét & Phân Tích Bằng AI\" ở cột bên trái.",
      results_trend_label: "Điểm Xu Hướng AI (Trend Score)",
      results_trend_scanning: "Đang quét...",
      results_trend_verdict: "Nón đang rất thịnh hành trên các mạng xã hội streetwear.",
      results_style_label: "Kiểu Dáng",
      results_material_label: "Chất Liệu Chủ Đạo",
      results_color_label: "Hệ Màu Thiết Kế (Dominant Colors)",
      results_desc_label: "Đánh Giá Thiết Kế & Thẩm Mỹ",
      results_outfit_label: "Gợi Ý Phối Đồ Từ Stylist AI",
      
      // Design Agent Chat
      agent_sidebar_title: "Bộ sưu tập cảm hứng",
      agent_sidebar_count: "nón",
      agent_sidebar_subtitle: "AI Design Agent sẽ tham khảo các mẫu nón này để nắm bắt gu thẩm mỹ của bạn",
      agent_sidebar_empty: "Chưa có nón yêu thích. Hãy \"Thích\" nón trên Bản tin để làm dữ liệu thiết kế!",
      agent_welcome_msg: "Chào bạn! Tôi là Trợ lý Thiết kế AI của CapInterest. Tôi đã đọc bộ sưu tập nón bạn đã thích để thấu hiểu gu thời trang của bạn.<br><br>Hãy đưa ra ý tưởng thiết kế nón của bạn (Ví dụ: <em>\"Mix nón Beanie phong cách Techwear với logo phát quang neon\"</em> hoặc <em>\"Tạo một nón bucket vải nhung corduroy màu nâu phối viền cam neon\"</em>), tôi sẽ thiết kế bản vẽ chi tiết và tạo prompt vẽ ảnh AI cho bạn!",
      agent_input_placeholder: "Mô tả ý tưởng thiết kế nón của bạn ở đây... (Ấn Enter để gửi, Shift+Enter xuống dòng)",
      agent_btn_send: "Gửi ý tưởng",
      ref_label: "Đang tham chiếu:",
      save_design_btn: "Lưu thiết kế vào BST",
      save_design_success: "Đã lưu thiết kế AI vào bộ sưu tập!",
      save_design_error: "Lỗi khi lưu thiết kế.",
      
      // Collection
      coll_title: "Bộ Sưu Tập Nón Yêu Thích",
      coll_count: "mẫu nón",
      coll_subtitle: "Các mẫu nón bạn đã lưu lại. Nhấn vào ảnh để xem chi tiết hoặc phân tích bằng AI.",
      coll_empty: "Chưa có nón nào trong bộ sưu tập. Hãy nhấn nút ♡ trên các mẫu nón ở Bản tin để lưu lại!",
      
      // Popups & General
      detail_specs_title: "Chi tiết thiết kế",
      detail_btn_analyze: "Đưa Vào AI Lab Phân Tích",
      detail_btn_brainstorm: "Brainstorm Thiết Kế Mới",
      detail_btn_source: "Xem nguồn ảnh gốc",
      
      // Feed loading & Statuses
      feed_loading: "Đang tải thêm nón...",
      feed_empty: "Không tìm thấy mẫu nón nào. Hãy thử tìm kiếm từ khóa khác!",
      status_scraping: "Đang cào ảnh nón mới từ web...",
      
      // Notifications
      notif_like_add: "Đã lưu vào bộ sưu tập nón yêu thích!",
      notif_like_remove: "Đã bỏ lưu nón.",
      notif_like_error: "Lỗi khi lưu nón.",
      notif_like_remove_error: "Lỗi khi bỏ lưu nón.",
      notif_account_restored: "Đã tự động khôi phục tài khoản và đồng bộ dữ liệu!",
      notif_migrate_success: "Đã tự động khôi phục {count} nón yêu thích từ bản sao lưu máy khách!",
      notif_settings_save_error: "Lỗi khi lưu cấu hình lên tài khoản. Cấu hình đã được lưu tạm trên máy này.",
      notif_settings_saved: "Đã lưu cấu hình AI!",
      notif_default_collection_shown: "Đã hiển thị bộ sưu tập nón có sẵn.",
      notif_login_required_chat: "Vui lòng đăng nhập để trò chuyện với AI Design Agent!",
      notif_collection_cleared: "Đã xóa toàn bộ bộ sưu tập.",
      notif_collection_clear_failed: "Không thể xóa bộ sưu tập trên server.",
      notif_welcome_back: "Chào mừng quay trở lại, @{username}!",
      notif_logged_out: "Đã đăng xuất tài khoản.",
      notif_sync_success: "Đã đồng bộ thành công {count} mẫu nón vào tài khoản của bạn!",
      notif_sync_failed: "Đồng bộ thất bại. Vui lòng thử lại sau.",
      notif_login_required_backup: "Bạn cần đăng nhập để sao lưu hệ thống!",
      notif_backup_downloaded: "Đã tải xuống tệp sao lưu dữ liệu!",
      notif_login_required_restore: "Bạn cần đăng nhập để phục hồi hệ thống!",
      notif_restore_invalid: "Tệp sao lưu không hợp lệ! Thiếu users hoặc collections.",
      notif_restore_success: "Khôi phục dữ liệu hệ thống thành công! Đang đồng bộ lại...",
      notif_restore_failed_prefix: "Khôi phục thất bại: ",
      notif_url_required: "Vui lòng điền liên kết nón!",
      notif_add_success: "Đã lưu nón và chia sẻ thành công lên hệ thống!",
      notif_error_prefix: "Lỗi: ",
      notif_design_process_error: "Lỗi khi xử lý ý tưởng thiết kế.",
      notif_save_hat_error_default: "Không thể lưu nón",
      notif_register_success: "Đăng ký tài khoản thành công!",
      notif_backup_failed_prefix: "Lỗi khi tải bản sao lưu: ",
      status_searching: "Đang tìm kiếm nón thiết kế độc lạ: \"{query}\"...",
      confirm_clear_collection: "Bạn có chắc muốn xóa toàn bộ bộ sưu tập?",
      confirm_logout: "Bạn có chắc muốn đăng xuất?",
 
      // Add Link Modal
      add_title: "Thêm Nón Từ Liên Kết",
      add_subtitle: "Dán liên kết hình ảnh nón từ Pinterest hoặc web khác để hiển thị trên bản tin của bạn",
      add_label_url: "Liên kết hình ảnh (Image URL)",
      add_placeholder_url: "Dán link Pinterest, Unsplash hoặc link ảnh...",
      add_btn_resolve: "Tự động lấy ảnh",
      add_label_title: "Tên nón (Tiêu đề thiết kế)",
      add_placeholder_title: "Ví dụ: Nón Snapback Đen Retro",
      add_label_creator: "Nhà thiết kế / Nguồn ảnh",
      add_placeholder_creator: "Ví dụ: pinterest_user",
      add_label_category: "Phân loại nón",
      add_btn_save: "Thêm vào Bản tin",
 
      // Auth Modal
      auth_tab_login: "Đăng nhập",
      auth_tab_register: "Đăng ký",
      auth_label_username: "Tên đăng nhập",
      auth_placeholder_username: "Nhập tên đăng nhập...",
      auth_placeholder_username_reg: "Tên đăng nhập (ít nhất 3 ký tự)...",
      auth_label_password: "Mật khẩu",
      auth_placeholder_password: "Nhập mật khẩu...",
      auth_placeholder_password_reg: "Mật khẩu (ít nhất 6 ký tự)...",
      auth_label_confirm_password: "Xác nhận mật khẩu",
      auth_placeholder_confirm_password: "Nhập lại mật khẩu...",
      auth_btn_login: "Đăng nhập",
      auth_btn_register: "Đăng ký tài khoản",
 
      // Migration Banner
      mig_title: "Đồng bộ dữ liệu",
      mig_text_prefix: "Phát hiện ",
      mig_text_suffix: " mẫu nón yêu thích được lưu cục bộ. Đồng bộ lên tài khoản này ngay?",
      mig_btn_confirm: "Đồng bộ ngay",
      mig_btn_cancel: "Hủy",

      // --- New Phase 2 translation keys (Vietnamese) ---
      doc_title: "CapInterest - Pinterest cho Nón Mũ Trendy & AI Phân Tích",
      notif_login_required_chat_placeholder: "Vui lòng đăng nhập để trò chuyện với AI Design Agent...",
      settings_saving: "Đang lưu...",
      auth_logging_in: "Đang đăng nhập...",
      auth_registering: "Đang đăng ký...",
      mig_syncing: "Đang đồng bộ...",
      backup_loading: "Đang tải...",
      restore_restoring: "Đang khôi phục...",
      resolve_url_empty: "Vui lòng nhập liên kết trang web hoặc ảnh trước.",
      resolve_status_fetching: "Đang tự động lấy dữ liệu ảnh...",
      resolve_error_extract: "Không thể tự động trích xuất thông tin.",
      resolve_status_success: "Trích xuất ảnh thành công!",
      add_default_title: "Nón liên kết",
      add_default_creator: "Link trực tiếp",
      add_saving_hat: "Đang lưu nón...",
      card_btn_scan: "Quét AI",
      card_title_unlike: "Bỏ lưu",
      auth_error_confirm_password: "Mật khẩu xác nhận không khớp!",
      ai_design_default_desc: "Thiết kế nón độc đáo được tạo bởi AI Design Agent.",
      color_copied: "Đã sao chép!",
      click_to_copy_color: "Click để sao chép mã màu",
      notif_scrape_failed: "Cào ảnh thất bại",
      btn_report_trash: "Báo cáo ảnh rác",
      notif_report_success: "Đã báo cáo ảnh không liên quan. Cảm ơn sự đóng góp của bạn!",
      notif_report_failed: "Gửi báo cáo thất bại. Vui lòng thử lại sau.",
      
      // AI Analyzer bilingual support keys
      analyzer_scanning: "AI Đang Phân Tích Thiết Kế...",
      analyzer_decoding: "AI đang giải mã cấu trúc sợi vải, phối màu và tính toán điểm xu hướng...",
      analyzer_failed: "Phân tích thất bại",
      analyzer_check_settings: "Vui lòng kiểm tra lại cấu hình API trong phần cài đặt.",
      style_default: "Nón Thời Trang",
      material_default: "Vải hỗn hợp",
      desc_default: "Không có đánh giá thẩm mỹ.",
      gauge_level_potential: "Tiềm Năng",
      gauge_verdict_potential: "Thiết kế độc đáo, có tiềm năng tạo xu hướng mới.",
      gauge_level_hyper: "Siêu Xu Hướng (Hyper-Trend)",
      gauge_verdict_hyper: "Thiết kế đang cực kỳ bùng nổ, dẫn đầu xu hướng thời trang streetwear!",
      gauge_level_trending: "Thịnh Hành (Trending)",
      gauge_verdict_trending: "Sản phẩm đang được ưa chuộng rộng rãi bởi giới trẻ và cộng đồng fashionista.",
      gauge_level_niche: "Phong Cách Ngách (Classic/Niche)",
      gauge_verdict_niche: "Một thiết kế cổ điển, mang tính thẩm mỹ bền vững, phù hợp gu thời trang kén chọn.",
      error_unknown_ai: "Lỗi không xác định khi kết nối AI",

      // Changelog Localization (Vietnamese)
      changelog_title: "Nhật Ký Cập Nhật (Changelog)",
      changelog_subtitle: "Lịch sử phát triển và nâng cấp hệ thống CapInterest phong cách Cyberpunk",
      changelog_date_v182: "27 Tháng 5, 2026",
      changelog_title_v182: "🧠 Bộ Lọc Học Máy Thích Ứng & Báo Cáo Rác Cộng Đồng (Adaptive ML Filter)",
      changelog_li1_v182: "<span class=\"highlight-purple\">Adaptive ML Filter:</span> Bộ lọc ML thích ứng tự động học hỏi từ các báo cáo hình ảnh của người dùng, nâng cao khả năng nhận diện ảnh rác theo thời gian.",
      changelog_li2_v182: "<span class=\"highlight-cyan\">Tự Động Tái Huấn Luyện (Auto-Retraining):</span> Hệ thống kích hoạt quy trình tự động huấn luyện lại mô hình Gemini 1.5 Flash sau mỗi 10 lượt báo cáo nón rác/không hợp lệ từ cộng đồng.",
      changelog_date_v180: "27 Tháng 5, 2026",
      changelog_title_v180: "🚀 Gemini Vision + Bộ Đệm Prefetch Vô Hạn + Báo Cáo Rác Tự Làm Sạch Cache",
      changelog_li1_v180: "<span class=\"highlight-purple\">Gemini Vision Curatorial Filter:</span> Xác thực hình ảnh đa phương thức phía máy chủ sử dụng gemini-1.5-flash kết hợp tải xuống song song để lọc ảnh rác thông minh.",
      changelog_li2_v180: "<span class=\"highlight-cyan\">Infinite Prefetch Buffer:</span> Cơ chế cuộn vô hạn mượt mà không có độ trễ giống Pinterest nhờ kỹ thuật tải trước (prefetch) hình ảnh dưới nền.",
      changelog_li3_v180: "<span class=\"highlight-cyan\">Crowd-sourced Flagging (Report Trash):</span> Thêm nút báo cáo ảnh rác/không liên quan trên giao diện, tự động xóa lập tức khỏi bộ nhớ cache và đưa vào danh sách đen động.",
      changelog_date_v170: "26 Tháng 5, 2026",
      changelog_title_v170: "🧩 Cybernetic Mood Board + Scraper Miễn Phí + Bộ Lọc Ảnh AI",
      changelog_li1_v170: "<span class=\"highlight-purple\">Cybernetic Mood Board:</span> Bảng ý tưởng sáng tạo phong cách mạch điện tử — kéo thả nón cảm hứng lên canvas vô hạn, vẽ đường liên kết neon giữa các node, nhấp đúp ghi chú kỹ thuật số, zoom/pan mượt mà và tích hợp AI phân tích cụm thiết kế.",
      changelog_li2_v170: "<span class=\"highlight-cyan\">DuckDuckGo & Bing Scraper:</span> Thêm module scrapers.js cào ảnh nón hoàn toàn miễn phí, không cần API key, hỗ trợ phân trang vô hạn qua DuckDuckGo (VQD token) và Bing (HTML parse).",
      changelog_li3_v170: "<span class=\"highlight-cyan\">Tích Hợp Firecrawl:</span> Thêm firecrawl_scraper.js sử dụng Firecrawl API làm overlay bổ sung ảnh nón từ Pinterest và các nguồn thời trang.",
      changelog_li4_v170: "<span class=\"highlight-cyan\">Bộ Lọc Ảnh AI (Gemini LLM):</span> Tích hợp filterHatsWithLLM dùng Gemini 1.5 Flash tự động phát hiện và loại bỏ ảnh rác (logo, quảng cáo, banner, anime, fanart) không liên quan đến nón/mũ/thời trang trước khi lưu cache.",
      changelog_li5_v170: "<span class=\"highlight-cyan\">Infinite Scroll Mở Rộng:</span> Feed trang chủ hỗ trợ tải trang vô hạn, tự động gọi thêm kết quả khi cuộn đến cuối, pipeline cào ưu tiên: Cache → DuckDuckGo → Bing → Serper → Firecrawl.",
      changelog_date_v160: "23 Tháng 5, 2026",
      changelog_title_v160: "🌐 Hỗ Trợ Đa Ngôn Ngữ & Thiết Kế Logo SVG Tự Động Từ AI Design Agent",
      changelog_li1_v160: "<span class=\"highlight-purple\">Hỗ Trợ Song Ngữ (VI/EN):</span> Tích hợp cấu trúc dịch tự động toàn bộ giao diện dựa trên thuộc tính `data-i18n`, hỗ trợ lưu cấu hình ngôn ngữ trực tiếp trong LocalStorage và đồng bộ hóa prompt AI tương ứng theo mã ngôn ngữ (`lang`).",
      changelog_li2_v160: "<span class=\"highlight-purple\">Sinh Logo SVG Tự Động Từ AI:</span> Tinh chỉnh prompts hệ thống của AI Design Agent để sinh khối code SVG sạch (viewBox 400x400) biểu diễn logo nón cách điệu phong cách Cyberpunk ở cuối phản hồi.",
      changelog_li3_v160: "<span class=\"highlight-purple\">Tương Tác Tham Chiếu BST:</span> Cho phép người dùng click chọn trực tiếp một mẫu nón trong Bộ sưu tập cảm hứng để làm tham chiếu gốc cho AI khi thiết kế nón mới, có phím hủy tham chiếu rõ ràng.",
      changelog_li4_v160: "<span class=\"highlight-purple\">Lưu Thiết Kế Vào BST:</span> Thêm nút \"Lưu thiết kế vào BST\" dưới khung chat bubble để người dùng lưu trực tiếp nón tự thiết kế kèm hình ảnh logo SVG chất lượng cao, an toàn tuyệt đối với CSDL gốc.",
      changelog_date_v153: "22 Tháng 5, 2026",
      changelog_title_v153: "🎨 Tinh Chỉnh UI/UX & Tối Ưu Hóa Hiệu Năng Hệ Thống",
      changelog_li1_v153: "<span class=\"highlight-cyan\">Sửa Lỗi Giao Diện & Di Động:</span> Khắc phục triệt để lỗi squashed sidebar tại AI Lab, căn chỉnh header tránh tràn viền trên tablet (768px - 1024px), và tối ưu hóa chiều cao Mobile Nav Bar cùng các vùng an toàn (safe-area-inset-bottom) của container chính, banner đồng bộ, và thông báo toast để tránh đè lấp phím điều hướng trên thiết bị có notch.",
      changelog_li2_v153: "<span class=\"highlight-cyan\">Hiệu ứng Cyberpunk:</span> Nâng cấp hiệu ứng chuyển động, neon hover glow cho card nón và các nút chức năng, tích hợp hoạt ảnh glitch độc đáo cho logo.",
      changelog_li3_v153: "<span class=\"highlight-cyan\">Tối Ưu Hóa Hiệu Năng Client-side:</span> Bổ sung debounce 500ms cho ô tìm kiếm, tích hợp cơ chế cache API /api/scrape vào sessionStorage để giảm tải DB và Serper API, đồng thời tự động dừng polling khi tab trình duyệt không hoạt động.",
      changelog_date_v152: "22 Tháng 5, 2026",
      changelog_title_v152: "⚙️ Đồng Nhất Cấu Hình Google AI Studio (Bỏ Chế Độ Demo)",
      changelog_li1_v152: "<span class=\"highlight-pink\">Bỏ Hoàn Toàn Demo Mode:</span> Gỡ bỏ toàn bộ code sinh dữ liệu giả lập (mock response) trên Backend. Khi cấu hình sai hoặc thiếu API Key, hệ thống sẽ trả trực tiếp thông tin lỗi chi tiết về giao diện người dùng.",
      changelog_li2_v152: "<span class=\"highlight-pink\">Giao Diện Settings Tinh Gọn:</span> Ẩn menu chọn chế độ AI Mode, mặc định chuyển toàn bộ hệ thống sang sử dụng Google AI Studio (Gemini API) với API Key của người dùng.",
      changelog_li3_v152: "<span class=\"highlight-pink\">Tự Động Di Trú (Auto-Migration):</span> Hệ thống tự động chuyển đổi cấu hình cũ từ 'demo' sang 'gemini' trên máy khách để tránh các lỗi không tương thích.",
      changelog_date_v151: "22 Tháng 5, 2026",
      changelog_title_v151: "🤖 Kết Nối Gemini 3.5 Flash & Sửa Lỗi Giao Diện",
      changelog_li1_v151: "<span class=\"highlight-cyan\">AI Design Agent Direct API:</span> Chạy trực tiếp qua model Gemini 3.5 Flash và endpoint v1beta bằng API Key của người dùng, loại bỏ chế độ mô phỏng demo.",
      changelog_li2_v151: "<span class=\"highlight-cyan\">Minh Bạch Lỗi Kết Nối:</span> Loại bỏ fallback âm thầm khi API Key lỗi hoặc lỗi mạng; thông báo chi tiết lỗi Google API trực tiếp vào giao diện chat để người dùng tiện kiểm tra.",
      changelog_li3_v151: "<span class=\"highlight-cyan\">UI Bộ Sưu Tập Bền Bỉ (Resilient):</span> Thay đổi cơ chế ẩn/xóa card nón khi ảnh lỗi bằng ảnh placeholder nón mặc định, giữ cho giao diện hiển thị bộ sưu tập không bị lỗi mất card do Render xóa đĩa tạm.",
      changelog_date_v140: "21 Tháng 5, 2026",
      changelog_title_v140: "💾 CSDL Chung & Lưu Trữ Đám Mây / Drive Fallback",
      changelog_li1_v140: "<span class=\"highlight-cyan\">Shared Caching DB:</span> Lưu trữ và chia sẻ các mẫu nón tự dán link hiển thị lên bản tin chung cho tất cả người dùng khác.",
      changelog_li2_v140: "<span class=\"highlight-cyan\">Google Drive Storage:</span> Hỗ trợ tải & lưu trữ hình ảnh nón lên Google Drive bằng tài khoản dịch vụ (Service Account).",
      changelog_li3_v140: "<span class=\"highlight-cyan\">Fail-safe Local Fallback:</span> Tự động chuyển lưu cục bộ tại thư mục public/uploads/ nếu Google Drive API gặp sự cố.",
      changelog_li4_v140: "<span class=\"highlight-cyan\">Serper Credit Limiter:</span> Kiểm soát giới hạn API tìm kiếm Serper (30 lượt/ngày) để tối ưu hóa credits và tự động tìm kiếm kết hợp trên cache.",
      changelog_date_v130: "21 Tháng 5, 2026",
      changelog_title_v130: "🔥 Trợ Lý AI Thiết Kế & Đồng Bộ Real-time",
      changelog_li1_v130: "<span class=\"highlight-cyan\">AI Design Agent:</span> Tích hợp chatbot thời trang, tự động đọc gu thẩm mỹ từ bộ sưu tập của bạn để gợi ý ý tưởng và viết prompt vẽ ảnh Midjourney/DALL-E.",
      changelog_li2_v130: "<span class=\"highlight-cyan\">Real-time Polling Sync:</span> Đồng bộ hóa bộ sưu tập lập tức qua nền hệ thống, không cần reload lại trang khi thích/bỏ thích trên thiết bị khác.",
      changelog_li3_v130: "<span class=\"highlight-cyan\">Backup & Restore JSON:</span> Thêm chức năng xuất và nhập cơ sở dữ liệu hệ thống trực tiếp trong cài đặt.",
      changelog_li4_v130: "<span class=\"highlight-cyan\">Cyberpunk Branding:</span> Cập nhật Logo và Favicon phong cách nón Neon Cyberpunk độc quyền.",
      changelog_date_v120: "20 Tháng 5, 2026",
      changelog_title_v120: "🛡️ API Key Riêng Tư & Fail-safe Dự Phòng",
      changelog_li1_v120: "<span class=\"highlight-pink\">Lưu AI Key Theo Tài Khoản:</span> Cho phép người dùng nhập và lưu trữ Gemini API Key cá nhân đồng bộ trên đám mây.",
      changelog_li2_v120: "<span class=\"highlight-pink\">Client-side Fail-safe:</span> Tự động tạo bản sao lưu cục bộ (mirror) và đẩy ngược lên server khi Render tự xóa dữ liệu tạm thời.",
      changelog_li3_v120: "<span class=\"highlight-pink\">Popup Viewport Fix:</span> Tối ưu khung chi tiết nón, ngăn tràn viền trên Safari iPhone 12 Pro Max.",
      changelog_date_v110: "19 Tháng 5, 2026",
      changelog_title_v110: "📱 Mobile Responsive & Account System",
      changelog_li1_v110: "<span class=\"highlight-cyan\">Authentication:</span> Hệ thống Đăng nhập / Đăng ký dùng JWT Token và mã hóa mật khẩu phía server.",
      changelog_li2_v110: "<span class=\"highlight-cyan\">Mobile Bottom Bar:</span> Thanh điều hướng phong cách ứng dụng di động sang xịn mịn ở dưới cùng màn hình.",
      changelog_li3_v110: "<span class=\"highlight-cyan\">Responsive Masonry:</span> Grid co giãn tối ưu, tự động chuyển về 2 cột trên điện thoại mà vẫn giữ tỷ lệ ảnh gốc.",
      changelog_date_v100: "18 Tháng 5, 2026",
      changelog_title_v100: "🚀 Khởi Chạy CapInterest",
      changelog_li1_v100: "<span class=\"highlight-purple\">Pinterest Feed:</span> Thu thập hình ảnh nón mũ thời trang trực tuyến thông qua công cụ tìm kiếm và cào dữ liệu.",
      changelog_li2_v100: "<span class=\"highlight-purple\">AI Scanner:</span> Máy quét tia laser thông minh, phân tích chất liệu, kiểu dáng nón và chấm điểm xu hướng nón."
    },
    en: {
      // Header & Navigation
      logo_sub: "Interest",
      search_placeholder: "Search trendy hats/caps (e.g., cyberpunk, vintage dad hat, bucket...)",
      nav_feed: "Feed",
      nav_collection: "Collection",
      nav_ailab: "AI Lab",
      nav_changelog: "Changelog",
      nav_add_link: "Paste Hat Link",
      nav_login: "Login",
      nav_logout: "Logout",
      
      // Tooltips & extra keys
      title_add_link: "Add hat by image URL",
      title_logout: "Logout",
      title_settings: "Configure API Key",
      settings_apikey_placeholder: "Enter your API Key (AIzaSy...)",
      coll_clear_btn: "Clear all",
      
      // Category pills
      cat_all: "All",
      cat_trendy: "Trending",
      cat_snapback: "Snapback",
      cat_bucket: "Bucket Hat",
      cat_beanie: "Beanie",
      cat_dadhat: "Classic Cap",
      cat_techwear: "Techwear / Visor",
      cat_creative: "Creative",
      
      // Settings
      settings_title: "AI Configuration Settings",
      settings_subtitle: "Enter Gemini API Key from Google AI Studio for AI analysis (gemini-3.5-flash)",
      settings_lang_label: "Interface Language",
      settings_apikey_label: "Google Gemini API Key",
      settings_apikey_help: "Get your free API Key at Google AI Studio. The key is saved directly in your browser's local storage and securely synchronized with your personal account.",
      settings_backup_label: "System Administration (Backup & Restore)",
      settings_backup_help: "Back up the entire system database (Accounts + Collections) to your computer or restore from a saved file.",
      settings_backup_btn: "Download Backup JSON",
      settings_restore_btn: "Restore JSON",
      settings_save_btn: "Save Settings",
      
      // AI Lab Tabs
      tab_scanner: "AI Scanner",
      tab_agent: "AI Design Agent Chat",
      tab_moodboard: "Mood Board",
      mb_toolbar_select: "Select / Pan",
      mb_toolbar_link: "Draw Link",
      mb_toolbar_clear: "Clear Board",
      mb_toolbar_analyze: "AI Cluster Analyze",
      mb_empty_board: "Drag and drop hats from sidebar or click them to add to the mood board",
      
      // Scanner
      scanner_title: "Design Scanner (AI Scanner)",
      scanner_subtitle: "Upload your hat image or select a preset sample for auto AI analysis",
      scanner_dropzone_main: "Drag & drop image here or click to browse",
      scanner_dropzone_sub: "Supports PNG, JPG, JPEG",
      scanner_samples_title: "Or choose a preset hat sample:",
      scanner_btn_scan: "Scan & Analyze with AI",
      scanner_btn_reset: "Scan another image",
      
      // Results
      results_title: "Design Analysis Results",
      results_subtitle: "Detailed information about shape, material, color, and trendiness",
      results_placeholder: "No analysis data. Upload an image and click \"Scan & Analyze with AI\" on the left panel.",
      results_trend_label: "AI Trend Score",
      results_trend_scanning: "Scanning...",
      results_trend_verdict: "This hat is highly trending in streetwear social media.",
      results_style_label: "Shape/Style",
      results_material_label: "Primary Material",
      results_color_label: "Design Color System (Dominant Colors)",
      results_desc_label: "Design & Aesthetic Evaluation",
      results_outfit_label: "Outfit Suggestions from AI Stylist",
      
      // Design Agent Chat
      agent_sidebar_title: "Inspiration Collection",
      agent_sidebar_count: "hats",
      agent_sidebar_subtitle: "AI Design Agent will refer to these hats to capture your design tastes",
      agent_sidebar_empty: "No liked hats. Like hats on the Feed to provide design reference data!",
      agent_welcome_msg: "Hello! I am CapInterest's AI Design Assistant. I have analyzed your liked hat collection to understand your fashion tastes.<br><br>Tell me your hat design idea (e.g., <em>\"Mix a beanie style with Techwear and neon glowing logos\"</em> or <em>\"Create a corduroy brown bucket hat with neon orange trims\"</em>). I will draft a detailed concept and generate AI image prompts for you!",
      agent_input_placeholder: "Describe your hat design idea here... (Press Enter to send, Shift+Enter for new line)",
      agent_btn_send: "Send Idea",
      ref_label: "Referencing:",
      save_design_btn: "Save Design to Collection",
      save_design_success: "AI design saved to collection!",
      save_design_error: "Error saving design.",
      
      // Collection
      coll_title: "Favorite Hats Collection",
      coll_count: "hats",
      coll_subtitle: "Your saved hat models. Click on an image to view details or analyze with AI.",
      coll_empty: "No hats in collection. Press the ♡ button on hats in the Feed to save them!",
      
      // Popups & General
      detail_specs_title: "Design Details",
      detail_btn_analyze: "Send to AI Lab Scanner",
      detail_btn_brainstorm: "Brainstorm New Design",
      detail_btn_source: "View Original Image Source",
      
      // Feed loading & Statuses
      feed_loading: "Loading more hats...",
      feed_empty: "No hats found. Try another search keyword!",
      status_scraping: "Scraping new hats from the web...",
      
      // Notifications
      notif_like_add: "Saved to favorite hats collection!",
      notif_like_remove: "Removed from collection.",
      notif_like_error: "Error saving hat.",
      notif_like_remove_error: "Error removing hat.",
      notif_account_restored: "Account recovered and data synchronized automatically!",
      notif_migrate_success: "Automatically restored {count} favorite hats from client backup!",
      notif_settings_save_error: "Error saving configuration to account. Configuration has been saved temporarily on this device.",
      notif_settings_saved: "AI configuration saved!",
      notif_default_collection_shown: "Default hat collection displayed.",
      notif_login_required_chat: "Please log in to chat with the AI Design Agent!",
      notif_collection_cleared: "Entire collection cleared.",
      notif_collection_clear_failed: "Could not clear collection on server.",
      notif_welcome_back: "Welcome back, @{username}!",
      notif_logged_out: "Logged out successfully.",
      notif_sync_success: "Successfully synchronized {count} hats to your account!",
      notif_sync_failed: "Synchronization failed. Please try again later.",
      notif_login_required_backup: "You need to log in to download system backup!",
      notif_backup_downloaded: "System backup file downloaded!",
      notif_login_required_restore: "You need to log in to restore system database!",
      notif_restore_invalid: "Invalid backup file! Missing users or collections.",
      notif_restore_success: "System database restored successfully! Synchronizing...",
      notif_restore_failed_prefix: "Restore failed: ",
      notif_url_required: "Please enter a hat link!",
      notif_add_success: "Hat saved and shared successfully to feed!",
      notif_error_prefix: "Error: ",
      notif_design_process_error: "Error processing design idea.",
      notif_save_hat_error_default: "Could not save hat",
      notif_register_success: "Registered account successfully!",
      notif_backup_failed_prefix: "Error downloading backup: ",
      status_searching: "Searching for unique custom hats: \"{query}\"...",
      confirm_clear_collection: "Are you sure you want to clear the entire collection?",
      confirm_logout: "Are you sure you want to log out?",
 
      // Add Link Modal
      add_title: "Add Hat from Link",
      add_subtitle: "Paste a hat image link from Pinterest or other sites to display on your feed",
      add_label_url: "Image URL",
      add_placeholder_url: "Paste Pinterest, Unsplash or image link...",
      add_btn_resolve: "Auto Fetch Image",
      add_label_title: "Hat Name (Design Title)",
      add_placeholder_title: "e.g., Retro Black Snapback",
      add_label_creator: "Designer / Image Source",
      add_placeholder_creator: "e.g., pinterest_user",
      add_label_category: "Hat Category",
      add_btn_save: "Add to Feed",
 
      // Auth Modal
      auth_tab_login: "Login",
      auth_tab_register: "Register",
      auth_label_username: "Username",
      auth_placeholder_username: "Enter username...",
      auth_placeholder_username_reg: "Username (at least 3 characters)...",
      auth_label_password: "Password",
      auth_placeholder_password: "Enter password...",
      auth_placeholder_password_reg: "Password (at least 6 characters)...",
      auth_label_confirm_password: "Confirm Password",
      auth_placeholder_confirm_password: "Confirm password...",
      auth_btn_login: "Login",
      auth_btn_register: "Register Account",
 
      // Migration Banner
      mig_title: "Sync Data",
      mig_text_prefix: "Detected ",
      mig_text_suffix: " locally saved favorite hats. Sync to this account now?",
      mig_btn_confirm: "Sync Now",
      mig_btn_cancel: "Cancel",

      // --- New Phase 2 translation keys (English) ---
      doc_title: "CapInterest - Pinterest for Trendy Hats & AI Analysis",
      notif_login_required_chat_placeholder: "Please log in to chat with the AI Design Agent...",
      settings_saving: "Saving...",
      auth_logging_in: "Logging in...",
      auth_registering: "Registering...",
      mig_syncing: "Syncing...",
      backup_loading: "Loading...",
      restore_restoring: "Restoring...",
      resolve_url_empty: "Please enter a website or image link first.",
      resolve_status_fetching: "Auto-fetching image data...",
      resolve_error_extract: "Could not automatically extract information.",
      resolve_status_success: "Image extracted successfully!",
      add_default_title: "Linked Hat",
      add_default_creator: "Direct Link",
      add_saving_hat: "Saving hat...",
      card_btn_scan: "AI Scan",
      card_title_unlike: "Unlike",
      auth_error_confirm_password: "Confirm password does not match!",
      ai_design_default_desc: "Unique hat design created by AI Design Agent.",
      color_copied: "Copied!",
      click_to_copy_color: "Click to copy color code",
      notif_scrape_failed: "Scraping failed",
      btn_report_trash: "Report Trash",
      notif_report_success: "Image reported. Thank you for your feedback!",
      notif_report_failed: "Failed to send report. Please try again later.",
      
      // AI Analyzer bilingual support keys
      analyzer_scanning: "AI is Analyzing Design...",
      analyzer_decoding: "AI is decoding fabric structures, color palettes, and calculating trend scores...",
      analyzer_failed: "Analysis Failed",
      analyzer_check_settings: "Please verify your API configuration in settings.",
      style_default: "Fashion Hat",
      material_default: "Mixed Fabric",
      desc_default: "No aesthetic evaluation.",
      gauge_level_potential: "Potential",
      gauge_verdict_potential: "Unique design with potential to start new trends.",
      gauge_level_hyper: "Hyper-Trend",
      gauge_verdict_hyper: "This design is exploding, leading the streetwear fashion trends!",
      gauge_level_trending: "Trending",
      gauge_verdict_trending: "Highly popular among youth and the fashionista community.",
      gauge_level_niche: "Classic/Niche",
      gauge_verdict_niche: "A classic design with sustainable aesthetics, suitable for selective fashion tastes.",
      error_unknown_ai: "Unknown error connecting to AI",

      // Changelog Localization (English)
      changelog_title: "Update History (Changelog)",
      changelog_subtitle: "Development history and system upgrades of CapInterest in Cyberpunk style",
      changelog_date_v182: "May 27, 2026",
      changelog_title_v182: "🧠 Adaptive ML Filter & Crowd-Sourced Flagging (v1.8.2)",
      changelog_li1_v182: "<span class=\"highlight-purple\">Adaptive ML Filter:</span> Adaptive ML curatorial filter automatically learns from user image reports to improve trash/spam detection over time.",
      changelog_li2_v182: "<span class=\"highlight-cyan\">Auto-Retraining:</span> Triggers server-side model retraining using Gemini 1.5 Flash automatically for every 10 reported hats/irrelevant images.",
      changelog_date_v180: "May 27, 2026",
      changelog_title_v180: "🚀 Gemini Vision + Infinite Prefetch Buffer + Crowd-sourced Flagging (v1.8.0)",
      changelog_li1_v180: "<span class=\"highlight-purple\">Gemini Vision Curatorial Filter:</span> Server-side multimodal image verification using gemini-1.5-flash with parallel downloads for smart filtering.",
      changelog_li2_v180: "<span class=\"highlight-cyan\">Infinite Prefetch Buffer:</span> Zero-latency continuous scrolling similar to Pinterest utilizing background prefetching mechanism.",
      changelog_li3_v180: "<span class=\"highlight-cyan\">Crowd-sourced Flagging (Report Trash):</span> UI button to report irrelevant images, instantly evicting them from cache and dynamic blacklisting them.",
      changelog_date_v170: "May 26, 2026",
      changelog_title_v170: "🧩 Cybernetic Mood Board + Free Scrapers + AI Image Filter",
      changelog_li1_v170: "<span class=\"highlight-purple\">Cybernetic Mood Board:</span> Circuit-style creative board — drag and drop inspiration hats onto an infinite canvas, draw neon link paths between nodes, double-click to add digital notes, smooth zoom/pan and AI-powered cluster analysis.",
      changelog_li2_v170: "<span class=\"highlight-cyan\">DuckDuckGo & Bing Scraper:</span> Added scrapers.js module for completely free hat image scraping (no API key needed), with infinite pagination via DuckDuckGo (VQD token) and Bing (HTML parse).",
      changelog_li3_v170: "<span class=\"highlight-cyan\">Firecrawl Integration:</span> Added firecrawl_scraper.js using the Firecrawl API as an overlay to supplement hat images from Pinterest and fashion sources.",
      changelog_li4_v170: "<span class=\"highlight-cyan\">AI Image Filter (Gemini LLM):</span> Integrated filterHatsWithLLM using Gemini 1.5 Flash to automatically detect and remove garbage images (logos, ads, banners, anime, fanart) unrelated to hats/caps/fashion before writing to cache.",
      changelog_li5_v170: "<span class=\"highlight-cyan\">Expanded Infinite Scroll:</span> Home feed supports endless loading, auto-fetching more results on scroll, with scraper priority pipeline: Cache → DuckDuckGo → Bing → Serper → Firecrawl.",
      changelog_date_v160: "May 23, 2026",
      changelog_title_v160: "🌐 Multilingual Support & Automatic SVG Logo Design from AI Design Agent",
      changelog_li1_v160: "<span class=\"highlight-purple\">Bilingual Support (VI/EN):</span> Integrated automatic translation logic for the entire interface using `data-i18n` attributes, supporting language configuration saved in LocalStorage and AI prompt synchronization by language code (`lang`).",
      changelog_li2_v160: "<span class=\"highlight-purple\">Auto-generated SVG Logo:</span> Refined system prompts for the AI Design Agent to generate clean SVG code (viewBox 400x400) representing stylized Cyberpunk-style hat logos at the end of responses.",
      changelog_li3_v160: "<span class=\"highlight-purple\">Collection Reference Interaction:</span> Allowed users to click a hat in their Inspiration Collection to use as a base reference for AI to design new hats, with a clear cancel button.",
      changelog_li4_v160: "<span class=\"highlight-purple\">Save Design to Collection:</span> Added a \"Save Design to Collection\" button under the chat bubbles to directly save custom-designed hats with high-quality SVG logos, secure with the backend DB.",
      changelog_date_v153: "May 22, 2026",
      changelog_title_v153: "🎨 UI/UX Refinement & System Performance Optimization",
      changelog_li1_v153: "<span class=\"highlight-cyan\">Layout & Mobile Fixes:</span> Fixed squashed sidebar issue in AI Lab, aligned header to prevent overflow on tablets (768px - 1024px), optimized Mobile Nav Bar height and safe areas (safe-area-inset-bottom) for the main container, sync banner, and toasts to avoid overlapping navigation keys on notched devices.",
      changelog_li2_v153: "<span class=\"highlight-cyan\">Cyberpunk Effects:</span> Upgraded animation transitions, neon hover glows for hat cards and action buttons, and integrated a unique glitch animation for the logo.",
      changelog_li3_v153: "<span class=\"highlight-cyan\">Client-side Optimization:</span> Added a 500ms debounce to the search input, integrated sessionStorage caching for /api/scrape to reduce DB and Serper API loads, and auto-paused polling when browser tab is inactive.",
      changelog_date_v152: "May 22, 2026",
      changelog_title_v152: "⚙️ Unified Google AI Studio Configuration (No Demo Mode)",
      changelog_li1_v152: "<span class=\"highlight-pink\">Removed Demo Mode:</span> Removed all mock response logic from the Backend. When config is wrong or API Key is missing, detailed Google API errors are displayed to the user.",
      changelog_li2_v152: "<span class=\"highlight-pink\">Streamlined Settings UI:</span> Hidden the AI Mode selection menu, defaulted the entire system to Google AI Studio (Gemini API) using the user's API Key.",
      changelog_li3_v152: "<span class=\"highlight-pink\">Auto-Migration:</span> Auto-migrated old client configurations from 'demo' to 'gemini' to avoid compatibility issues.",
      changelog_date_v151: "May 22, 2026",
      changelog_title_v151: "🤖 Gemini 3.5 Flash Integration & Interface Fixes",
      changelog_li1_v151: "<span class=\"highlight-cyan\">AI Design Agent Direct API:</span> Runs directly through Gemini 3.5 Flash and v1beta endpoint using user's API Key, removing mock demo simulations.",
      changelog_li2_v151: "<span class=\"highlight-cyan\">Transparent Connection Errors:</span> Removed silent fallbacks on network or API Key errors; displayed detailed Google API errors directly in the chat for easier troubleshooting.",
      changelog_li3_v151: "<span class=\"highlight-cyan\">Resilient Collection UI:</span> Replaced failed images with default hat placeholders, preventing cards from disappearing when temporary disk storage is cleared on Render.",
      changelog_date_v140: "May 21, 2026",
      changelog_title_v140: "💾 Shared Caching DB & Google Drive Fallback",
      changelog_li1_v140: "<span class=\"highlight-cyan\">Shared Caching DB:</span> Saved and shared custom-added hats to the public feed for all users.",
      changelog_li2_v140: "<span class=\"highlight-cyan\">Google Drive Storage:</span> Supported uploading & storing hat images to Google Drive via Service Account.",
      changelog_li3_v140: "<span class=\"highlight-cyan\">Fail-safe Local Fallback:</span> Auto-fell back to public/uploads/ local directory when Google Drive API encountered issues.",
      changelog_li4_v140: "<span class=\"highlight-cyan\">Serper Credit Limiter:</span> Monitored Serper search limits (30 queries/day) to optimize credits, falling back to database query cache.",
      changelog_date_v130: "May 21, 2026",
      changelog_title_v130: "🔥 AI Design Agent & Real-time Sync",
      changelog_li1_v130: "<span class=\"highlight-cyan\">AI Design Agent:</span> Integrated fashion chatbot that reads your collection tastes to suggest design concepts and generate Midjourney/DALL-E prompts.",
      changelog_li2_v130: "<span class=\"highlight-cyan\">Real-time Polling Sync:</span> Synchronized favorite collections instantly in the background without needing page reloads when liked/unliked on another device.",
      changelog_li3_v130: "<span class=\"highlight-cyan\">Backup & Restore JSON:</span> Added export/import system database functionality directly in Settings.",
      changelog_li4_v130: "<span class=\"highlight-cyan\">Cyberpunk Branding:</span> Updated Logo and Favicon design to exclusive Neon Cyberpunk hats.",
      changelog_date_v120: "May 20, 2026",
      changelog_title_v120: "🛡️ Private API Keys & Fail-safe Backup Mirror",
      changelog_li1_v120: "<span class=\"highlight-pink\">Cloud API Key Storage:</span> Allowed users to enter and synchronize their Gemini API Keys to the cloud.",
      changelog_li2_v120: "<span class=\"highlight-pink\">Client-side Fail-safe:</span> Automatically created local backups (mirror) and pushed back to the server when Render cleared temporary files.",
      changelog_li3_v120: "<span class=\"highlight-pink\">Popup Viewport Fix:</span> Optimized hat detail modal layout, preventing overflow on Safari iPhone 12 Pro Max.",
      changelog_date_v110: "May 19, 2026",
      changelog_title_v110: "📱 Mobile Responsive & Account System",
      changelog_li1_v110: "<span class=\"highlight-cyan\">Authentication:</span> Sign in / Sign up system using JWT Tokens and server-side password encryption.",
      changelog_li2_v110: "<span class=\"highlight-cyan\">Mobile Bottom Bar:</span> Premium mobile bottom navigation bar.",
      changelog_li3_v110: "<span class=\"highlight-cyan\">Responsive Masonry:</span> Flexible grid that scales down to 2 columns on mobile.",
      changelog_date_v100: "May 18, 2026",
      changelog_title_v100: "🚀 CapInterest Launch",
      changelog_li1_v100: "<span class=\"highlight-purple\">Pinterest Feed:</span> Collected online hat/cap images via web search engines and scrapers.",
      changelog_li2_v100: "<span class=\"highlight-purple\">AI Scanner:</span> Intelligent laser scanner analyzing hat materials, shapes, and calculating trend scores."
    }
  };

  function getTranslation(key, replacements = {}) {
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.vi;
    let text = dict[key] || TRANSLATIONS.vi[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(`{${k}}`, v);
    }
    return text;
  }

  window.AppConfig = { getTranslation, state };

  function applyTranslations(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.vi;
    if (dict.doc_title) {
      document.title = dict.doc_title;
    }
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key]) {
        el.setAttribute('title', dict[key]);
      }
    });
    
    // Also re-render elements that depend on dynamic counts/labels
    const count = state.likedItemsObjects.length;
    const collCountEl = document.getElementById('collection-count');
    if (collCountEl) {
      collCountEl.innerHTML = `${count} <span data-i18n="coll_count">${dict.coll_count}</span>`;
    }
    const agentContextCountEl = document.getElementById('agent-context-count');
    if (agentContextCountEl) {
      agentContextCountEl.innerHTML = `${count} <span data-i18n="agent_sidebar_count">${dict.agent_sidebar_count}</span>`;
    }
    const moodboardContextCountEl = document.getElementById('moodboard-context-count');
    if (moodboardContextCountEl) {
      moodboardContextCountEl.innerHTML = `${count} <span data-i18n="agent_sidebar_count">${dict.agent_sidebar_count}</span>`;
    }

    // Re-render feed/grid and collection immediately
    if (state.currentFeedItems && state.currentFeedItems.length > 0) {
      renderGrid(state.currentFeedItems, false);
    }
    renderCollection();

    // Update Chat reference UI, input placeholders, and chat context
    updateChatReferenceUI();
    updateAuthUI();
    renderChatContext();
    renderMoodboardContext();
  }

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

        showNotification(getTranslation('notif_account_restored'));
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
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.vi;
    if (DOM.agentContextCount) {
      DOM.agentContextCount.innerHTML = `${count} <span data-i18n="agent_sidebar_count">${dict.agent_sidebar_count}</span>`;
    }

    DOM.likedContextList.innerHTML = '';
    if (count === 0) {
      DOM.likedContextList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.9rem;" data-i18n="agent_sidebar_empty">
          ${dict.agent_sidebar_empty}
        </div>
      `;
      return;
    }

    state.likedItemsObjects.forEach(item => {
      const itemId = item.id || item.image;
      const isSelected = state.selectedReferenceId === itemId;
      const itemEl = document.createElement('div');
      itemEl.className = `context-thumb-item ${isSelected ? 'selected-ref' : ''}`;
      itemEl.style.cursor = 'pointer';
      itemEl.title = `${item.title} by @${item.creator || 'streetwear'}`;
      
      if (isSelected) {
        itemEl.style.outline = '2px solid var(--accent-cyan)';
        itemEl.style.boxShadow = '0 0 10px var(--accent-cyan)';
      }
      
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.title}">
      `;
      itemEl.addEventListener('click', () => {
        if (state.selectedReferenceId === itemId) {
          state.selectedReferenceId = null;
        } else {
          state.selectedReferenceId = itemId;
        }
        renderChatContext();
        updateChatReferenceUI();
      });
      DOM.likedContextList.appendChild(itemEl);
    });
  }

  function updateChatReferenceUI() {
    if (!DOM.chatReferenceContainer || !DOM.chatReferenceTitle) return;
    
    if (state.selectedReferenceId) {
      const item = state.likedItemsObjects.find(o => (o.id || o.image) === state.selectedReferenceId);
      if (item) {
        DOM.chatReferenceTitle.textContent = item.title;
        DOM.chatReferenceContainer.style.display = 'flex';
      } else {
        state.selectedReferenceId = null;
        DOM.chatReferenceContainer.style.display = 'none';
      }
    } else {
      DOM.chatReferenceContainer.style.display = 'none';
      DOM.chatReferenceTitle.textContent = '';
    }
  }

  function generateCyberpunkLogoSvg(title) {
    const cleanTitle = title.replace(/["']/g, '');
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a14"/>
      <stop offset="50%" stop-color="#120e2e"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#4facfe"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff007f"/>
      <stop offset="100%" stop-color="#7f00ff"/>
    </linearGradient>
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="400" height="400" fill="url(#cyberGrad)"/>
  
  <!-- Cyberpunk grid lines -->
  <g stroke="#1a1a2e" stroke-width="1">
    <line x1="0" y1="50" x2="400" y2="50"/><line x1="0" y1="100" x2="400" y2="100"/><line x1="0" y1="150" x2="400" y2="150"/><line x1="0" y1="200" x2="400" y2="200"/><line x1="0" y1="250" x2="400" y2="250"/><line x1="0" y1="300" x2="400" y2="300"/><line x1="0" y1="350" x2="400" y2="350"/>
    <line x1="50" y1="0" x2="50" y2="400"/><line x1="100" y1="0" x2="100" y2="400"/><line x1="150" y1="0" x2="150" y2="400"/><line x1="200" y1="0" x2="200" y2="400"/><line x1="250" y1="0" x2="250" y2="400"/><line x1="300" y1="0" x2="300" y2="400"/><line x1="350" y1="0" x2="350" y2="400"/>
  </g>
  
  <!-- Outer glowing border -->
  <rect x="20" y="20" width="360" height="360" rx="12" fill="none" stroke="url(#neonGrad)" stroke-width="2" filter="url(#neonGlow)" opacity="0.6"/>
  
  <!-- Centered Glowing Geometric/Cybernetic Emblem -->
  <g transform="translate(200, 170)">
    <!-- Cybernetic lines / crosshairs -->
    <line x1="-90" y1="0" x2="90" y2="0" stroke="#ff007f" stroke-width="1" opacity="0.5" stroke-dasharray="4 4" />
    <line x1="0" y1="-100" x2="0" y2="105" stroke="#00f2fe" stroke-width="1" opacity="0.5" stroke-dasharray="4 4" />
    
    <!-- Outer Shield Outline -->
    <path d="M 0,-80 L 70,-35 L 70,30 L 0,85 L -70,30 L -70,-35 Z" fill="url(#accentGrad)" fill-opacity="0.15" stroke="url(#neonGrad)" stroke-width="3" filter="url(#neonGlow)" />
    
    <!-- Inner Accent Shield -->
    <path d="M 0,-65 L 55,-27 L 55,23 L 0,70 L -55,23 L -55,-27 Z" fill="none" stroke="url(#accentGrad)" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.8" />
    
    <!-- Neon Core (Hexagon) -->
    <polygon points="0,-35 25,-12 25,12 0,35 -25,12 -25,-12" fill="#00f2fe" filter="url(#neonGlow)" opacity="0.9" />
    <polygon points="0,-27 19,-9 19,9 0,27 -19,9 -19,-9" fill="#120e2e" />
    
    <!-- Central Power Source -->
    <circle cx="0" cy="0" r="5" fill="#ff007f" filter="url(#neonGlow)" />
    <circle cx="0" cy="0" r="2" fill="#ffffff" />
  </g>
  
  <text x="200" y="325" fill="#ffffff" font-family="'Outfit', sans-serif" font-size="18" font-weight="800" text-anchor="middle" filter="url(#neonGlow)">${cleanTitle}</text>
  <text x="200" y="352" fill="#00f2fe" font-family="'Outfit', sans-serif" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1">CAPINTEREST DESIGN LAB</text>
</svg>`.trim();
    return svg;
  }

  async function saveAiConceptToCollection(conceptName, rawText, svgCode) {
    const svgDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgCode);
    let desc = 'Thiết kế nón độc đáo được tạo bởi AI Design Agent.';
    const descMatch = rawText.match(/(?:Mô tả thiết kế|Design Description):\s*([\s\S]+?)(?:\*\*|$|###)/i);
    if (descMatch) {
      desc = descMatch[1].trim();
      if (desc.length > 250) {
        desc = desc.slice(0, 247) + '...';
      }
    }
    
    const item = {
      id: 'ai-concept-' + Date.now(),
      title: conceptName,
      image: svgDataUrl,
      creator: 'AI Design Agent',
      category: 'creative',
      source: 'AI Lab',
      url: '#',
      description: desc,
      tags: ['ai-design', 'vector-logo', 'cyberpunk', 'creative']
    };
    
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.vi;
    
    try {
      if (state.auth.token) {
        await apiCall('/api/collection/add', 'POST', { item });
        state.likedItems.push(item.id);
        state.likedItemsObjects.push(item);
        if (state.auth.username) {
          localStorage.setItem('capinterest_backup_likes_' + state.auth.username.toLowerCase(), JSON.stringify(state.likedItemsObjects));
        }
      } else {
        state.likedItems.push(item.id);
        state.likedItemsObjects.push(item);
        localStorage.setItem('capinterest_likes', JSON.stringify(state.likedItems));
        localStorage.setItem('capinterest_likes_objects', JSON.stringify(state.likedItemsObjects));
      }
      
      updateLikeButtonsUI();
      const count = state.likedItemsObjects.length;
      if (DOM.collectionBadge) {
        DOM.collectionBadge.textContent = count;
        DOM.collectionBadge.style.display = count > 0 ? 'inline-block' : 'none';
      }
      const mobileCollectionBadge = document.getElementById('mobile-collection-badge');
      if (mobileCollectionBadge) {
        mobileCollectionBadge.textContent = count;
        mobileCollectionBadge.style.display = count > 0 ? 'inline-block' : 'none';
      }
      
      const collCountEl = document.getElementById('collection-count');
      if (collCountEl) {
        collCountEl.innerHTML = `${count} <span data-i18n="coll_count">${dict.coll_count}</span>`;
      }
      
      showNotification(getTranslation('save_design_success'));
      return true;
    } catch (err) {
      console.error(err);
      showNotification(getTranslation('save_design_error'));
      return false;
    }
  }

  function appendChatMessage(sender, contentHtml, rawReply = '') {
    if (!DOM.agentChatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender === 'user' ? 'user-msg' : 'agent-msg'}`;
    
    let extraHtml = '';
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.vi;
    
    if (sender === 'agent' && rawReply) {
      const svgMatch = rawReply.match(/```(?:xml|svg|html)?\s*(<svg[\s\S]*?<\/svg>)\s*```/i) || rawReply.match(/(<svg[\s\S]*?<\/svg>)/i);
      let svgCode = svgMatch ? svgMatch[1].trim() : '';
      
      const conceptMatch = rawReply.match(/(?:Concept|🎩 Concept):\s*([^\n#\*]+)/i);
      let conceptName = conceptMatch ? conceptMatch[1].trim() : '';
      if (!conceptName) {
        // Fallback: search for first header (e.g. ### 🎩 Concept Name)
        const headerMatch = rawReply.match(/^###?\s+(?:🎩\s*)?([^\n#\*]+)/m);
        if (headerMatch) {
          conceptName = headerMatch[1].trim();
        }
      }
      if (!conceptName) {
        conceptName = 'AI Design Concept';
      }
      
      if (conceptName) {
        const finalSvg = svgCode || generateCyberpunkLogoSvg(conceptName);
        const svgDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(finalSvg);
        
        extraHtml = `
          <div class="ai-design-preview-box" style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-light); border-radius: 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; background: #07070d; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.2); box-shadow: 0 4px 20px rgba(0, 242, 254, 0.15); margin-bottom: 12px; overflow: hidden;">
              <img src="${svgDataUrl}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <button class="cta-btn active save-design-btn" style="padding: 6px 14px; font-size: 0.8rem; min-height: auto; width: auto; margin: 0; display: flex; align-items: center; gap: 6px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              <span>${dict.save_design_btn}</span>
            </button>
          </div>
        `;
        
        setTimeout(() => {
          const saveBtn = msgDiv.querySelector('.save-design-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
              saveBtn.disabled = true;
              const originalText = saveBtn.innerHTML;
              saveBtn.innerHTML = 'Saving...';
              
              const success = await saveAiConceptToCollection(conceptName, rawReply, finalSvg);
              if (success) {
                saveBtn.innerHTML = `✓ ${dict.save_design_success || 'Saved'}`;
                saveBtn.style.background = 'var(--accent-cyan)';
                saveBtn.style.color = '#000';
              } else {
                saveBtn.innerHTML = dict.save_design_error || 'Error';
                saveBtn.disabled = false;
              }
            });
          }
        }, 50);
      }
    }

    msgDiv.innerHTML = `
      <div class="msg-bubble">
        ${contentHtml}
        ${extraHtml}
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
        DOM.agentChatInput.placeholder = getTranslation('agent_input_placeholder');
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
        DOM.agentChatInput.placeholder = getTranslation('notif_login_required_chat_placeholder');
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
                  showNotification(getTranslation('notif_migrate_success', { count: migrateRes.added }));
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
    
    // Apply translations on load
    applyTranslations(state.lang);
    
    // Add default and manual hats to seen urls to prevent duplicates
    state.defaultHats.forEach(h => state.loadedImageUrls.add(h.image));
    state.manualHats.forEach(h => state.loadedImageUrls.add(h.image));
    
    // Set initial Auth UI state
    updateAuthUI();
    
    // Sync settings
    await syncUserSettings();
    
    // Load and sync collection
    await syncCollection();

    // Load saved moodboard state
    loadMoodboard();
    
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
    state.prefetchBuffer = [];
    state.prefetchPage = 2;
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
        DOM.saveSettingsBtn.textContent = getTranslation('settings_saving');
        await apiCall('/api/user/settings', 'POST', { aiMode: mode, apiKey: key });
      } catch (err) {
        console.error('Lỗi khi lưu cấu hình lên tài khoản:', err);
        showNotification(getTranslation('notif_settings_save_error'));
      } finally {
        DOM.saveSettingsBtn.disabled = false;
        DOM.saveSettingsBtn.textContent = getTranslation('settings_save_btn');
      }
    }
    
    DOM.settingsModal.classList.remove('active');
    
    // Visual Notification
    showNotification(getTranslation('notif_settings_saved'));
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
  async function prefetchNextPage(query, page) {
    if (state.isPrefetching || state.currentTab !== 'feed' || !state.hasMore) {
      return;
    }
    state.isPrefetching = true;
    try {
      console.log(`[Prefetch] Fetching page ${page} for query "${query}" in background...`);
      const response = await fetch(`/api/scrape?query=${encodeURIComponent(query)}&page=${page}&_t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        if (result && result.success && result.data) {
          state.prefetchBuffer = result.data;
          state.prefetchPage = page;
          if (typeof scrapeCache !== 'undefined' && scrapeCache.set) {
            scrapeCache.set(query, page, result);
          }
          console.log(`[Prefetch] Successfully prefetched page ${page} with ${result.data.length} items`);
        }
      }
    } catch (error) {
      console.error('[Prefetch Error]', error);
    } finally {
      state.isPrefetching = false;
    }
  }

  async function fetchScrapedHats(query, page = 1, append = false) {
    let isAutoRetrying = false;
    if (append) {
      if (state.prefetchBuffer && state.prefetchBuffer.length > 0 && state.prefetchPage === page) {
        console.log(`[Buffer Hit] Using prefetch buffer for page ${page}`);
        
        // Map and filter out duplicates using state.loadedImageUrls
        const newItems = [];
        state.prefetchBuffer.forEach(item => {
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

        state.scrapedData = [...state.scrapedData, ...newItems];
        if (newItems.length > 0) {
          state.currentFeedItems = [...(state.currentFeedItems || []), ...newItems];
          renderGrid(newItems, true);
        }
        
        // Reset the buffer
        state.prefetchBuffer = [];
        
        // Immediately kick off the background prefetch for the next page
        prefetchNextPage(query, page + 1);
        
        // Clean up loading indicator if applicable
        state.isLoadingNextPage = false;
        if (DOM.infiniteLoading) DOM.infiniteLoading.style.display = 'none';

        // Auto-trigger load if viewport is not full and we have more items
        if (state.currentTab === 'feed') {
          setTimeout(checkScrollHeight, 300);
        }
        return;
      }

      state.isLoadingNextPage = true;
      if (DOM.infiniteLoading) DOM.infiniteLoading.style.display = 'flex';
    } else {
      DOM.scrapeStatus.style.display = 'flex';
      DOM.scrapeStatusText.textContent = getTranslation('status_searching', { query: query });
      DOM.pinterestGrid.innerHTML = '';
      DOM.emptyState.style.display = 'none';
      state.currentPage = 1;
      state.hasMore = true;
      
      // Clear buffer and reset prefetchPage
      state.prefetchBuffer = [];
      state.prefetchPage = 2;

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
          throw new Error(result.error || getTranslation('notif_scrape_failed'));
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
          isAutoRetrying = true;
          setTimeout(() => fetchScrapedHats(query, state.currentPage, append), 200);
          return;
        } else {
          state.hasMore = false;
        }
      }

      if (append) {
        state.scrapedData = [...state.scrapedData, ...newItems];
        if (newItems.length > 0) {
          state.currentFeedItems = [...(state.currentFeedItems || []), ...newItems];
          renderGrid(newItems, true);
        }
        prefetchNextPage(query, page + 1);
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

        state.currentFeedItems = displayData;

        if (displayData.length === 0) {
          DOM.emptyState.style.display = 'flex';
        } else {
          renderGrid(displayData, false);
        }
        prefetchNextPage(query, 2);
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
        state.currentFeedItems = [...filteredManuals, ...filteredDefaults];
        renderGrid(state.currentFeedItems, false);
        showNotification(getTranslation('notif_default_collection_shown'));
      }
    } finally {
      if (!isAutoRetrying) {
        if (append) {
          state.isLoadingNextPage = false;
          if (DOM.infiniteLoading) DOM.infiniteLoading.style.display = 'none';
        } else {
          DOM.scrapeStatus.style.display = 'none';
        }
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
      card.className = 'cap-card card-entrance';
      card.setAttribute('data-id', item.id || item.image);
      card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=60'; this.classList.add('img-fallback');">
        <div class="cap-card-overlay">
          <div class="overlay-top">
            <button class="report-card-btn" data-i18n-title="btn_report_trash" title="${getTranslation('btn_report_trash')}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/></svg>
            </button>
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
                ${getTranslation('card_btn_scan')}
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listener for opening detail modal on card click (except when clicking buttons)
      card.addEventListener('click', (e) => {
        if (e.target.closest('.like-btn') || e.target.closest('.card-btn') || e.target.closest('.report-card-btn')) return;
        openDetailModal(item);
      });

      // Like Button Event
      const likeBtn = card.querySelector('.like-btn');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(item, likeBtn);
      });

      // Report Button Event
      const reportBtn = card.querySelector('.report-card-btn');
      reportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        reportImage(item, card);
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
          showNotification(getTranslation('notif_like_remove'));
        } catch (err) {
          console.error(err);
          showNotification(getTranslation('notif_like_remove_error'));
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
          showNotification(getTranslation('notif_like_add'));
        } catch (err) {
          console.error(err);
          showNotification(getTranslation('notif_like_error'));
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
        showNotification(getTranslation('notif_like_remove'));
      } else {
        state.likedItems.push(itemId);
        btnElement.classList.add('liked');
        state.likedItemsObjects.push(item);
        showNotification(getTranslation('notif_like_add'));
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
    DOM.collectionCount.textContent = `${items.length} ${getTranslation('coll_count')}`;
    
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
            <button class="like-btn liked" data-id="${item.id || item.image}" title="${getTranslation('card_title_unlike')}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </div>
          <div class="overlay-bottom">
            <h4 class="overlay-title">${item.title || getTranslation('coll_title')}</h4>
            <div class="overlay-meta">
              <span>@${item.creator || item.source || 'streetwear'}</span>
              <button class="card-btn" data-action="analyze">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg>
                ${getTranslation('card_btn_scan')}
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
    state.activeModalItem = item;
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

    const descText = item.description || (item.title + (state.lang === 'en'
      ? ' - Modern trendy hat design highly sought after by designers.'
      : ' - Kiểu nón thời trang hiện đại được nhiều nhà thiết kế săn đón.'));
    DOM.modalDesc.textContent = descText;

    // Setup action button inside modal
    DOM.modalAnalyzeBtn.onclick = () => {
      DOM.detailModal.classList.remove('active');
      sendImageToAiLab(item.image);
    };

    if (DOM.modalBrainstormBtn) {
      DOM.modalBrainstormBtn.onclick = () => {
        DOM.detailModal.classList.remove('active');
        if (!state.auth.token) {
          showNotification(getTranslation('notif_login_required_chat'));
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
          const brainstormPrompt = state.lang === 'en'
            ? `Please brainstorm and suggest a new design inspired by the hat model "${item.title}" by @${item.creator || 'fashion_source'} that I am viewing.`
            : `Hãy brainstorm và gợi ý thiết kế mới lấy cảm hứng từ mẫu nón "${item.title}" của @${item.creator || 'fashion_source'} mà tôi đang xem.`;
          DOM.agentChatInput.value = brainstormPrompt;
          DOM.agentChatInput.style.height = 'auto';
          DOM.agentChatInput.style.height = DOM.agentChatInput.scrollHeight + 'px';
          setTimeout(() => DOM.agentChatInput.focus(), 150);
        }
      };
    }

    DOM.detailModal.classList.add('active');
  }

  function closeDetailModal() {
    DOM.detailModal.classList.remove('active');
    state.activeModalItem = null;
  }

  async function reportImage(item, cardElement) {
    try {
      await apiCall('/api/hats/report', 'POST', {
        image: item.image,
        title: item.title,
        query: item.query || state.searchQuery
      });
      showNotification(getTranslation('notif_report_success'));
      if (cardElement) {
        cardElement.classList.add('card-fade-out');
        setTimeout(() => {
          cardElement.remove();
        }, 500);
      }
      if (state.activeModalItem && (state.activeModalItem.id === item.id || state.activeModalItem.image === item.image)) {
        closeDetailModal();
      }
    } catch (error) {
      console.error('Report failed:', error);
      showNotification(getTranslation('notif_report_failed'));
    }
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
    // Infinite Scroll IntersectionObserver
    if (DOM.infiniteScrollTrigger) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && state.currentTab === 'feed' && !state.isLoadingNextPage && state.hasMore) {
            loadNextPage();
          }
        });
      }, {
        rootMargin: '100px'
      });
      observer.observe(DOM.infiniteScrollTrigger);
    }

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
      if (confirm(getTranslation('confirm_clear_collection'))) {
        if (state.auth.token) {
          try {
            // Delete all items one by one on the server
            const promises = state.likedItems.map(itemId => 
              apiCall('/api/collection/remove', 'DELETE', { itemId }).catch(() => {})
            );
            await Promise.all(promises);
            await syncCollection();
            showNotification(getTranslation('notif_collection_cleared'));
          } catch (err) {
            showNotification(getTranslation('notif_collection_clear_failed'));
          }
        } else {
          state.likedItems = [];
          state.likedItemsObjects = [];
          localStorage.setItem('capinterest_likes', '[]');
          localStorage.setItem('capinterest_likes_objects', '[]');
          updateCollectionBadge();
          renderCollection();
          showNotification(getTranslation('notif_collection_cleared'));
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
          submitBtn.textContent = getTranslation('auth_logging_in');

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
            showNotification(getTranslation('notif_welcome_back', { username: res.username }));
          }
        } catch (err) {
          DOM.loginError.textContent = err.message;
          DOM.loginError.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = getTranslation('auth_btn_login');
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
          DOM.registerError.textContent = getTranslation('auth_error_confirm_password');
          DOM.registerError.style.display = 'block';
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.textContent = getTranslation('auth_registering');

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
            showNotification(getTranslation('notif_register_success'));
          }
        } catch (err) {
          DOM.registerError.textContent = err.message;
          DOM.registerError.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = getTranslation('auth_btn_register');
        }
      });
    }

    // Logout Action
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(getTranslation('confirm_logout'))) {
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
          
          showNotification(getTranslation('notif_logged_out'));

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
          DOM.migrationConfirmBtn.textContent = getTranslation('mig_syncing');
          
          const res = await apiCall('/api/collection/migrate', 'POST', { items: localLikes });
          if (res.success) {
            localStorage.removeItem('capinterest_likes');
            localStorage.removeItem('capinterest_likes_objects');
            
            DOM.migrationBanner.style.display = 'none';
            await syncCollection();
            showNotification(getTranslation('notif_sync_success', { count: res.added }));
          }
        } catch (err) {
          console.error(err);
          showNotification(getTranslation('notif_sync_failed'));
        } finally {
          DOM.migrationConfirmBtn.disabled = false;
          DOM.migrationConfirmBtn.textContent = getTranslation('mig_btn_confirm');
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

    if (DOM.settingsLangSelect) {
      DOM.settingsLangSelect.value = state.lang;
      DOM.settingsLangSelect.addEventListener('change', () => {
        const selectedLang = DOM.settingsLangSelect.value;
        state.lang = selectedLang;
        localStorage.setItem('capinterest_lang', selectedLang);
        applyTranslations(selectedLang);
      });
    }

    // Backup & Restore listeners
    if (DOM.dbBackupBtn) {
      DOM.dbBackupBtn.addEventListener('click', async () => {
        if (!state.auth.token) {
          showNotification(getTranslation('notif_login_required_backup'));
          return;
        }
        try {
          DOM.dbBackupBtn.disabled = true;
          const originalText = DOM.dbBackupBtn.innerHTML;
          DOM.dbBackupBtn.innerHTML = getTranslation('backup_loading');
          const res = await apiCall('/api/admin/backup');
          if (res.success) {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `capinterest_backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showNotification(getTranslation('notif_backup_downloaded'));
          }
          DOM.dbBackupBtn.innerHTML = originalText;
        } catch (err) {
          console.error(err);
          showNotification(getTranslation('notif_backup_failed_prefix') + err.message);
        } finally {
          DOM.dbBackupBtn.disabled = false;
        }
      });
    }

    if (DOM.dbRestoreTriggerBtn && DOM.dbRestoreFileInput) {
      DOM.dbRestoreTriggerBtn.addEventListener('click', () => {
        if (!state.auth.token) {
          showNotification(getTranslation('notif_login_required_restore'));
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
              showNotification(getTranslation('notif_restore_invalid'));
              return;
            }

            DOM.dbRestoreTriggerBtn.disabled = true;
            const originalText = DOM.dbRestoreTriggerBtn.innerHTML;
            DOM.dbRestoreTriggerBtn.innerHTML = getTranslation('restore_restoring');

            const res = await apiCall('/api/admin/restore', 'POST', data);
            if (res.success) {
              showNotification(getTranslation('notif_restore_success'));
              await syncUserSettings();
              await syncCollection();
              fetchScrapedHats('trendy caps');
              DOM.settingsModal.classList.remove('active');
            }
            DOM.dbRestoreTriggerBtn.innerHTML = originalText;
          } catch (err) {
            console.error(err);
            showNotification(getTranslation('notif_restore_failed_prefix') + err.message);
          } finally {
            DOM.dbRestoreTriggerBtn.disabled = false;
            DOM.dbRestoreFileInput.value = '';
          }
        };
        reader.readAsText(file);
      });
    }

    // AI Lab Sub-Tab Toggles
    if (DOM.tabScannerBtn && DOM.tabAgentBtn && DOM.tabMoodboardBtn && DOM.scannerContent && DOM.agentContent && DOM.moodboardContent) {
      DOM.tabScannerBtn.addEventListener('click', () => {
        DOM.tabScannerBtn.classList.add('active');
        DOM.tabAgentBtn.classList.remove('active');
        DOM.tabMoodboardBtn.classList.remove('active');
        DOM.scannerContent.classList.add('active');
        DOM.agentContent.classList.remove('active');
        DOM.moodboardContent.classList.remove('active');
      });

      DOM.tabAgentBtn.addEventListener('click', () => {
        DOM.tabAgentBtn.classList.add('active');
        DOM.tabScannerBtn.classList.remove('active');
        DOM.tabMoodboardBtn.classList.remove('active');
        DOM.agentContent.classList.add('active');
        DOM.scannerContent.classList.remove('active');
        DOM.moodboardContent.classList.remove('active');
        renderChatContext();
      });

      DOM.tabMoodboardBtn.addEventListener('click', () => {
        DOM.tabMoodboardBtn.classList.add('active');
        DOM.tabScannerBtn.classList.remove('active');
        DOM.tabAgentBtn.classList.remove('active');
        DOM.moodboardContent.classList.add('active');
        DOM.scannerContent.classList.remove('active');
        DOM.agentContent.classList.remove('active');
        renderMoodboardContext();
        setTimeout(() => {
          drawConnections();
        }, 100);
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
          const refItem = state.selectedReferenceId 
            ? state.likedItemsObjects.find(o => (o.id || o.image) === state.selectedReferenceId) 
            : null;

          const res = await apiCall('/api/design-chat', 'POST', {
            prompt: promptText,
            collection: state.likedItemsObjects,
            apiKey: localStorage.getItem('capinterest_apikey') || '',
            lang: state.lang,
            referenceItem: refItem
          });

          const loadingEl = document.getElementById(loadingId);
          if (loadingEl) {
            const msgDiv = loadingEl.closest('.message');
            if (msgDiv) msgDiv.remove();
          }
          appendChatMessage('agent', formatMarkdownToHtml(res.reply), res.reply);
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

      if (DOM.chatReferenceClear) {
        DOM.chatReferenceClear.addEventListener('click', () => {
          state.selectedReferenceId = null;
          renderChatContext();
          updateChatReferenceUI();
        });
      }
    }

    // Detail Modal Close
    DOM.closeDetailModal.addEventListener('click', () => {
      closeDetailModal();
    });

    // Detail Modal Report Button
    if (DOM.modalReportBtn) {
      DOM.modalReportBtn.addEventListener('click', () => {
        const activeItem = state.activeModalItem;
        if (activeItem) {
          const targetId = activeItem.id || activeItem.image;
          const cardElement = document.querySelector(`.cap-card[data-id="${targetId}"]`);
          reportImage(activeItem, cardElement);
        }
      });
    }

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
          DOM.resolveStatus.textContent = getTranslation('resolve_url_empty');
          return;
        }

        DOM.resolveStatus.style.display = 'block';
        DOM.resolveStatus.style.color = 'var(--accent-cyan)';
        DOM.resolveStatus.textContent = getTranslation('resolve_status_fetching');
        DOM.resolveUrlBtn.disabled = true;

        try {
          const response = await fetch('/api/resolve-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || getTranslation('resolve_error_extract'));
          }

          const info = result.data;
          DOM.addTitleInput.value = info.title || '';
          DOM.addCreatorInput.value = info.creator || '';
          DOM.resolvePreviewImg.src = info.image;
          DOM.resolvePreviewContainer.style.display = 'block';

          DOM.resolveStatus.style.color = '#39ff14'; // Neon Green
          DOM.resolveStatus.textContent = getTranslation('resolve_status_success');
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
          showNotification(getTranslation('notif_url_required'));
          return;
        }

        const category = DOM.addCategorySelect.value;
        const title = DOM.addTitleInput.value.trim() || getTranslation('add_default_title');
        const creator = DOM.addCreatorInput.value.trim() || getTranslation('add_default_creator');
        const tags = [category, 'user-added', 'headwear'];

        // Show loading spinner/disabled state
        const originalText = DOM.saveAddBtn.textContent;
        DOM.saveAddBtn.disabled = true;
        DOM.saveAddBtn.textContent = getTranslation('add_saving_hat');

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
            throw new Error(result.error || getTranslation('notif_save_hat_error_default'));
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

          showNotification(getTranslation('notif_add_success'));

          // Refresh grid
          const query = state.searchQuery ? state.searchQuery : (state.selectedCategory === 'all' ? 'trendy caps' : state.selectedCategory + ' headwear');
          fetchScrapedHats(query);

        } catch (err) {
          console.error('[Add Hat] Error:', err);
          const errorMsg = err.message || getTranslation('notif_save_hat_error_default');
          showNotification(getTranslation('notif_error_prefix') + errorMsg);
        } finally {
          DOM.saveAddBtn.disabled = false;
          DOM.saveAddBtn.textContent = originalText;
        }
      });
    }
    
    // Close modals on clicking overlay background
    window.addEventListener('click', (e) => {
      if (e.target === DOM.detailModal) closeDetailModal();
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

    // Initialize Mood Board listeners
    initMoodboardListeners();
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
      <p>${getTranslation('results_placeholder')}</p>
    `;
    DOM.resultPlaceholder.style.display = 'flex';
    DOM.resultContent.style.display = 'none';
  }

  // ==========================================================================
  // Cybernetic Mood Board Implementation
  // ==========================================================================
  
  function initMoodboardListeners() {
    if (!DOM.moodboardCanvasViewport) return;

    // Load saved data
    loadMoodboard();
    updateCanvasTransform();
    updateZoomIndicator();
    
    // Initial rendering of nodes
    state.moodboard.nodes.forEach(node => {
      renderNode(node);
    });
    
    // Toggle Select Mode
    DOM.mbToolSelect.addEventListener('click', () => {
      state.moodboard.mode = 'select';
      DOM.mbToolSelect.classList.add('active');
      DOM.mbToolLink.classList.remove('active');
      
      // Clear pending link if any
      state.moodboard.linkStartNodeId = null;
      state.moodboard.tempLinkEnd = null;
      document.querySelectorAll('.moodboard-node').forEach(el => el.classList.remove('selected-origin'));
      drawConnections();
    });

    // Toggle Link Mode
    DOM.mbToolLink.addEventListener('click', () => {
      state.moodboard.mode = 'link';
      DOM.mbToolLink.classList.add('active');
      DOM.mbToolSelect.classList.remove('active');
    });

    // Zoom Buttons
    DOM.mbToolZoomIn.addEventListener('click', () => {
      adjustZoom(1.2);
    });

    DOM.mbToolZoomOut.addEventListener('click', () => {
      adjustZoom(1 / 1.2);
    });

    DOM.mbToolZoomReset.addEventListener('click', () => {
      state.moodboard.zoom = 1.0;
      state.moodboard.panX = 0;
      state.moodboard.panY = 0;
      updateCanvasTransform();
      updateZoomIndicator();
      drawConnections();
      saveMoodboard();
    });

    // Clear Board
    DOM.mbToolClear.addEventListener('click', () => {
      const confirmMsg = state.lang === 'vi' 
        ? "Bạn có chắc chắn muốn xóa toàn bộ bảng ý tưởng?" 
        : "Are you sure you want to clear the entire mood board?";
      if (confirm(confirmMsg)) {
        state.moodboard.nodes = [];
        state.moodboard.links = [];
        DOM.moodboardCanvas.querySelectorAll('.moodboard-node').forEach(el => el.remove());
        drawConnections();
        updateEmptyMsgVisibility();
        saveMoodboard();
      }
    });

    function generateClusterAnalyzePrompt() {
      const isVi = state.lang === 'vi';
      let nodesText = '';
      state.moodboard.nodes.forEach(node => {
        if (node.type === 'hat') {
          const creatorStr = node.creator ? ` (@${node.creator})` : '';
          if (isVi) {
            nodesText += `- Nón: "${node.title}"${creatorStr}\n`;
            if (node.text) {
              nodesText += `  Ghi chú: "${node.text}"\n`;
            }
          } else {
            nodesText += `- Hat: "${node.title}"${creatorStr}\n`;
            if (node.text) {
              nodesText += `  Note: "${node.text}"\n`;
            }
          }
        } else if (node.type === 'sticky') {
          if (isVi) {
            nodesText += `- Ghi chú dán: "${node.text}"\n`;
          } else {
            nodesText += `- Sticky Note: "${node.text}"\n`;
          }
        }
      });

      let linksText = '';
      state.moodboard.links.forEach(link => {
        const sourceNode = state.moodboard.nodes.find(n => n.id === link.sourceId);
        const targetNode = state.moodboard.nodes.find(n => n.id === link.targetId);
        if (sourceNode && targetNode) {
          const getDisplayName = (n) => {
            if (n.type === 'hat') {
              return `"${n.title}"`;
            } else {
              return isVi ? `Ghi chú "${n.text}"` : `Sticky Note "${n.text}"`;
            }
          };
          const sourceName = getDisplayName(sourceNode);
          const targetName = getDisplayName(targetNode);
          if (isVi) {
            linksText += `- ${sourceName} liên kết với ${targetName}\n`;
          } else {
            linksText += `- ${sourceName} is connected to ${targetName}\n`;
          }
        }
      });

      if (!linksText) {
        linksText = isVi ? "(Không có đường liên kết nào)" : "(No connections)";
      }

      let prompt = '';
      if (isVi) {
        prompt = `Hãy phân tích cụm thiết kế nón sau đây từ Bảng ý tưởng (Mood Board) của tôi:\n\n` +
                 `**Danh sách mẫu nón và ghi chú:**\n${nodesText}\n` +
                 `**Các liên kết kết nối:**\n${linksText}\n\n` +
                 `Hãy phân tích các mẫu thiết kế trên, tìm ra sự tương đồng và định hướng thời trang tiềm năng của cụm này. Sau đó, gợi ý một ý tưởng thiết kế nón lai (hybrid) mới lạ kết hợp các yếu tố trên, kèm theo mã nguồn SVG vẽ logo biểu tượng Cyberpunk đặc trưng cho nón mới này ở cuối phản hồi (đặt trong tag \`\`\`xml hoặc \`\`\`html với viewBox 400x400).`;
      } else {
        prompt = `Please analyze the following hat design cluster from my Mood Board:\n\n` +
                 `**Hats & Notes:**\n${nodesText}\n` +
                 `**Connection trace links:**\n${linksText}\n\n` +
                 `Please analyze these designs, find their similarities and potential fashion direction. Then suggest a new hybrid design concept combining these elements, and provide a unique Cyberpunk SVG logo design for this new concept at the end of your response (wrapped in a clean \`\`\`xml or \`\`\`html block with viewBox 400x400).`;
      }

      return prompt;
    }

    // AI Cluster Analyze Button
    DOM.mbToolAnalyze.addEventListener('click', async () => {
      if (state.moodboard.nodes.length === 0) {
        showNotification(state.lang === 'vi' ? 'Bảng ý tưởng đang trống!' : 'The mood board is empty!');
        return;
      }
      
      const prompt = generateClusterAnalyzePrompt();
      
      // Switch to Agent Chat sub-tab
      DOM.tabAgentBtn.click();
      
      // Populate chat input and trigger sendMessage
      DOM.agentChatInput.value = prompt;
      
      // Auto-focus chat input
      DOM.agentChatInput.focus();
      
      // Dispatch Enter event or call agentSendBtn click handler
      DOM.agentSendBtn.click();
    });

    // Canvas Panning Logic
    let isMouseDown = false;
    let startX, startY;

    DOM.moodboardCanvasViewport.addEventListener('mousedown', (e) => {
      // If clicking inside a node or toolbar button, ignore
      if (e.target.closest('.moodboard-node') || e.target.closest('.mb-tool-btn')) return;

      isMouseDown = true;
      startX = e.clientX - state.moodboard.panX;
      startY = e.clientY - state.moodboard.panY;
      DOM.moodboardCanvasViewport.style.cursor = 'grabbing';
      
      // Clear pending link if clicking empty canvas in link mode
      if (state.moodboard.linkStartNodeId) {
        state.moodboard.linkStartNodeId = null;
        state.moodboard.tempLinkEnd = null;
        document.querySelectorAll('.moodboard-node').forEach(el => el.classList.remove('selected-origin'));
        drawConnections();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        state.moodboard.panX = e.clientX - startX;
        state.moodboard.panY = e.clientY - startY;
        updateCanvasTransform();
      }
      
      // Track mouse position for link drawing overlay if drawing
      if (state.moodboard.mode === 'link' && state.moodboard.linkStartNodeId) {
        const rect = DOM.moodboardCanvasViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        state.moodboard.tempLinkEnd = {
          x: (mouseX - state.moodboard.panX) / state.moodboard.zoom,
          y: (mouseY - state.moodboard.panY) / state.moodboard.zoom
        };
        drawConnections();
      }
    });

    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        DOM.moodboardCanvasViewport.style.cursor = 'grab';
        saveMoodboard();
      }
    });

    // Canvas Zoom (Wheel Scroll)
    DOM.moodboardCanvasViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      let newZoom = state.moodboard.zoom;
      if (e.deltaY < 0) {
        newZoom *= zoomFactor;
      } else {
        newZoom /= zoomFactor;
      }
      
      newZoom = Math.max(0.2, Math.min(3.0, newZoom));
      
      const rect = DOM.moodboardCanvasViewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const canvasX = (mouseX - state.moodboard.panX) / state.moodboard.zoom;
      const canvasY = (mouseY - state.moodboard.panY) / state.moodboard.zoom;
      
      state.moodboard.zoom = newZoom;
      state.moodboard.panX = mouseX - canvasX * newZoom;
      state.moodboard.panY = mouseY - canvasY * newZoom;
      
      updateCanvasTransform();
      updateZoomIndicator();
      drawConnections();
      saveMoodboard();
    }, { passive: false });

    // Drag over / leave / drop for dropping hats from the sidebar
    DOM.moodboardCanvasViewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.moodboardCanvasViewport.classList.add('dragover');
    });

    DOM.moodboardCanvasViewport.addEventListener('dragleave', () => {
      DOM.moodboardCanvasViewport.classList.remove('dragover');
    });

    DOM.moodboardCanvasViewport.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.moodboardCanvasViewport.classList.remove('dragover');
      try {
        const rawData = e.dataTransfer.getData('application/json');
        if (!rawData) return;
        const item = JSON.parse(rawData);
        
        const rect = DOM.moodboardCanvasViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - state.moodboard.panX) / state.moodboard.zoom;
        const canvasY = (mouseY - state.moodboard.panY) / state.moodboard.zoom;
        
        addNodeToMoodboard({
          type: 'hat',
          x: canvasX - 70,
          y: canvasY - 70,
          title: item.title,
          creator: item.creator,
          image: item.image,
          refId: item.id || item.image
        });
      } catch (err) {
        console.error('Error dropping node on moodboard:', err);
      }
    });

    // Double click viewport to create sticky note
    DOM.moodboardCanvasViewport.addEventListener('dblclick', (e) => {
      if (e.target === DOM.moodboardCanvasViewport || e.target === DOM.moodboardCanvas) {
        const rect = DOM.moodboardCanvasViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const canvasX = (mouseX - state.moodboard.panX) / state.moodboard.zoom;
        const canvasY = (mouseY - state.moodboard.panY) / state.moodboard.zoom;
        
        addNodeToMoodboard({
          type: 'sticky',
          x: canvasX - 75,
          y: canvasY - 40,
          text: state.lang === 'vi' ? 'Nhấp đúp để chỉnh sửa' : 'Double click to edit'
        });
      }
    });
    
    // Draw initial SVG lines
    setTimeout(() => {
      drawConnections();
      updateEmptyMsgVisibility();
    }, 200);
  }

  function adjustZoom(factor) {
    let newZoom = state.moodboard.zoom * factor;
    newZoom = Math.max(0.2, Math.min(3.0, newZoom));
    
    // Zoom centered around viewport middle
    const rect = DOM.moodboardCanvasViewport.getBoundingClientRect();
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    
    const canvasX = (midX - state.moodboard.panX) / state.moodboard.zoom;
    const canvasY = (midY - state.moodboard.panY) / state.moodboard.zoom;
    
    state.moodboard.zoom = newZoom;
    state.moodboard.panX = midX - canvasX * newZoom;
    state.moodboard.panY = midY - canvasY * newZoom;
    
    updateCanvasTransform();
    updateZoomIndicator();
    drawConnections();
    saveMoodboard();
  }

  function updateCanvasTransform() {
    if (DOM.moodboardCanvas) {
      DOM.moodboardCanvas.style.transform = `translate(${state.moodboard.panX}px, ${state.moodboard.panY}px) scale(${state.moodboard.zoom})`;
    }
  }

  function updateZoomIndicator() {
    if (DOM.mbZoomLevel) {
      DOM.mbZoomLevel.textContent = `${Math.round(state.moodboard.zoom * 100)}%`;
    }
  }

  function renderMoodboardContext() {
    if (!DOM.moodboardContextList) return;

    const count = state.likedItemsObjects.length;
    const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.vi;
    if (DOM.moodboardContextCount) {
      DOM.moodboardContextCount.innerHTML = `${count} <span data-i18n="agent_sidebar_count">${dict.agent_sidebar_count}</span>`;
    }

    DOM.moodboardContextList.innerHTML = '';
    if (count === 0) {
      DOM.moodboardContextList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.9rem;" data-i18n="agent_sidebar_empty">
          ${dict.agent_sidebar_empty}
        </div>
      `;
      return;
    }

    state.likedItemsObjects.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'context-thumb-item';
      itemEl.style.cursor = 'pointer';
      itemEl.title = `${item.title} by @${item.creator || 'streetwear'}`;
      itemEl.draggable = true;
      
      itemEl.innerHTML = `
        <img src="${item.image}" alt="${item.title}">
      `;
      
      // Dragstart event
      itemEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
      });
      
      // Click event adds it to center of viewport
      itemEl.addEventListener('click', () => {
        const rect = DOM.moodboardCanvasViewport.getBoundingClientRect();
        const mouseX = rect.width / 2;
        const mouseY = rect.height / 2;
        
        const canvasX = (mouseX - state.moodboard.panX) / state.moodboard.zoom;
        const canvasY = (mouseY - state.moodboard.panY) / state.moodboard.zoom;
        
        addNodeToMoodboard({
          type: 'hat',
          x: canvasX - 70,
          y: canvasY - 70,
          title: item.title,
          creator: item.creator,
          image: item.image,
          refId: item.id || item.image
        });
      });
      
      DOM.moodboardContextList.appendChild(itemEl);
    });
  }

  function addNodeToMoodboard(nodeData) {
    const node = {
      id: 'mb-node-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      type: nodeData.type,
      x: nodeData.x,
      y: nodeData.y,
      title: nodeData.title || '',
      creator: nodeData.creator || '',
      image: nodeData.image || '',
      refId: nodeData.refId || null,
      text: nodeData.text || ''
    };
    
    state.moodboard.nodes.push(node);
    renderNode(node);
    updateEmptyMsgVisibility();
    saveMoodboard();
  }

  function renderNode(node) {
    const existing = document.getElementById(node.id);
    if (existing) existing.remove();
    
    const nodeEl = document.createElement('div');
    nodeEl.id = node.id;
    nodeEl.style.left = `${node.x}px`;
    nodeEl.style.top = `${node.y}px`;
    
    if (node.type === 'hat') {
      nodeEl.className = 'moodboard-node hat-node';
      if (state.moodboard.linkStartNodeId === node.id) {
        nodeEl.classList.add('selected-origin');
      }
      
      const noteHtml = node.text ? `<div class="node-note" style="border-top: 1px dashed var(--accent-cyan); padding: 6px; font-size: 0.72rem; color: var(--accent-cyan); font-family: monospace; white-space: pre-wrap; word-break: break-word;">${node.text}</div>` : '';
      
      nodeEl.innerHTML = `
        <button class="node-close-btn">&times;</button>
        <div class="node-img-container">
          <img src="${node.image}" alt="${node.title}">
        </div>
        <div class="node-title-container">
          <span class="node-title">${node.title}</span>
          <span class="node-creator">@${node.creator || 'streetwear'}</span>
        </div>
        ${noteHtml}
      `;
    } else if (node.type === 'sticky') {
      nodeEl.className = 'moodboard-node sticky-node';
      nodeEl.innerHTML = `
        <button class="node-close-btn" style="top: 2px; right: 2px;">&times;</button>
        <div class="sticky-header">TERMINAL NOTE</div>
        <div class="sticky-content">${node.text || 'DOUBLE CLICK TO EDIT'}</div>
      `;
    }
    
    // Close button
    nodeEl.querySelector('.node-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNode(node.id);
    });
    
    // Double click to edit note
    nodeEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openStickyEditor(node);
    });
    
    makeNodeDraggable(nodeEl, node);
    DOM.moodboardCanvas.appendChild(nodeEl);
  }

  function deleteNode(nodeId) {
    state.moodboard.nodes = state.moodboard.nodes.filter(n => n.id !== nodeId);
    state.moodboard.links = state.moodboard.links.filter(l => l.sourceId !== nodeId && l.targetId !== nodeId);
    
    const nodeEl = document.getElementById(nodeId);
    if (nodeEl) nodeEl.remove();
    
    if (state.moodboard.linkStartNodeId === nodeId) {
      state.moodboard.linkStartNodeId = null;
      state.moodboard.tempLinkEnd = null;
    }
    
    drawConnections();
    updateEmptyMsgVisibility();
    saveMoodboard();
  }

  function makeNodeDraggable(nodeEl, nodeData) {
    let dragNode = null;
    let nodeStartX, nodeStartY;

    nodeEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.node-close-btn')) return;
      
      // If in Link drawing mode
      if (state.moodboard.mode === 'link') {
        e.stopPropagation();
        handleLinkModeClick(nodeData.id);
        return;
      }
      
      e.stopPropagation();
      dragNode = nodeData;
      nodeStartX = e.clientX / state.moodboard.zoom - nodeData.x;
      nodeStartY = e.clientY / state.moodboard.zoom - nodeData.y;
      nodeEl.classList.add('dragging');
    });

    const moveHandler = (e) => {
      if (!dragNode || dragNode.id !== nodeData.id) return;
      let newX = e.clientX / state.moodboard.zoom - nodeStartX;
      let newY = e.clientY / state.moodboard.zoom - nodeStartY;
      
      // Clamp coordinates to stay within a reasonable canvas area
      newX = Math.max(0, Math.min(3000 - 150, newX));
      newY = Math.max(0, Math.min(3000 - 200, newY));
      
      dragNode.x = newX;
      dragNode.y = newY;
      nodeEl.style.left = `${newX}px`;
      nodeEl.style.top = `${newY}px`;
      
      drawConnections();
    };

    const upHandler = () => {
      if (dragNode && dragNode.id === nodeData.id) {
        nodeEl.classList.remove('dragging');
        dragNode = null;
        saveMoodboard();
      }
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };

    nodeEl.addEventListener('mousedown', () => {
      if (state.moodboard.mode !== 'link') {
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', upHandler);
      }
    });
  }

  function handleLinkModeClick(nodeId) {
    if (!state.moodboard.linkStartNodeId) {
      // Start drawing link
      state.moodboard.linkStartNodeId = nodeId;
      const nodeEl = document.getElementById(nodeId);
      if (nodeEl) nodeEl.classList.add('selected-origin');
    } else {
      // Complete drawing link
      const sourceId = state.moodboard.linkStartNodeId;
      const targetId = nodeId;
      
      if (sourceId !== targetId) {
        // Check if connection already exists
        const exists = state.moodboard.links.some(l => 
          (l.sourceId === sourceId && l.targetId === targetId) ||
          (l.sourceId === targetId && l.targetId === sourceId)
        );
        
        if (!exists) {
          state.moodboard.links.push({ sourceId, targetId });
        }
      }
      
      // Reset drawing state
      state.moodboard.linkStartNodeId = null;
      state.moodboard.tempLinkEnd = null;
      document.querySelectorAll('.moodboard-node').forEach(el => el.classList.remove('selected-origin'));
      drawConnections();
      saveMoodboard();
    }
  }

  function getNodeCenter(node) {
    const nodeEl = document.getElementById(node.id);
    if (!nodeEl) return { x: node.x + 70, y: node.y + 70 };
    const w = nodeEl.offsetWidth || (node.type === 'hat' ? 140 : 150);
    const h = nodeEl.offsetHeight || (node.type === 'hat' ? 192 : 100);
    return {
      x: node.x + w / 2,
      y: node.y + h / 2
    };
  }

  function drawConnections() {
    if (!DOM.moodboardSvgOverlay) return;
    DOM.moodboardSvgOverlay.innerHTML = '';
    
    state.moodboard.links.forEach(link => {
      const sourceNode = state.moodboard.nodes.find(n => n.id === link.sourceId);
      const targetNode = state.moodboard.nodes.find(n => n.id === link.targetId);
      if (!sourceNode || !targetNode) return;
      
      const p1 = getNodeCenter(sourceNode);
      const p2 = getNodeCenter(targetNode);
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      
      let pathData;
      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        const offset = Math.min(50, len * 0.15);
        const cx = (p1.x + p2.x) / 2 + nx * offset;
        const cy = (p1.y + p2.y) / 2 + ny * offset;
        pathData = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
      } else {
        pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      }
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      DOM.moodboardSvgOverlay.appendChild(path);
    });
    
    if (state.moodboard.linkStartNodeId && state.moodboard.tempLinkEnd) {
      const sourceNode = state.moodboard.nodes.find(n => n.id === state.moodboard.linkStartNodeId);
      if (sourceNode) {
        const p1 = getNodeCenter(sourceNode);
        const p2 = state.moodboard.tempLinkEnd;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`);
        path.setAttribute('class', 'pending-link');
        DOM.moodboardSvgOverlay.appendChild(path);
      }
    }
  }

  function updateEmptyMsgVisibility() {
    if (!DOM.moodboardEmptyMsg) return;
    if (state.moodboard.nodes.length === 0) {
      DOM.moodboardEmptyMsg.style.display = 'block';
    } else {
      DOM.moodboardEmptyMsg.style.display = 'none';
    }
  }

  function openStickyEditor(node) {
    const editorOverlay = document.createElement('div');
    editorOverlay.className = 'sticky-editor-overlay';
    
    const titleText = node.type === 'hat' 
      ? (state.lang === 'vi' ? 'CHÚ THÍCH CẢM HỨNG NÓN' : 'HAT INSPIRATION NOTE')
      : (state.lang === 'vi' ? 'CHỈNH SỬA GHI CHÚ' : 'EDIT TERMINAL NOTE');
      
    editorOverlay.innerHTML = `
      <div class="sticky-editor-card">
        <h3>${titleText}</h3>
        <textarea id="sticky-textarea" placeholder="${state.lang === 'vi' ? 'Nhập ghi chú ý tưởng tại đây...' : 'Enter your design note here...'}">${node.text || ''}</textarea>
        <div class="sticky-editor-actions">
          <button class="sticky-editor-cancel" id="sticky-cancel-btn">${state.lang === 'vi' ? 'Hủy bỏ' : 'Cancel'}</button>
          <button class="sticky-editor-save" id="sticky-save-btn">${state.lang === 'vi' ? 'Lưu lại' : 'Save'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(editorOverlay);
    const textarea = editorOverlay.querySelector('#sticky-textarea');
    textarea.focus();
    textarea.select();
    
    editorOverlay.querySelector('#sticky-cancel-btn').addEventListener('click', () => {
      editorOverlay.remove();
    });
    
    editorOverlay.querySelector('#sticky-save-btn').addEventListener('click', () => {
      node.text = textarea.value.trim();
      renderNode(node);
      drawConnections();
      saveMoodboard();
      editorOverlay.remove();
    });
    
    editorOverlay.querySelector('.sticky-editor-card').addEventListener('dblclick', (e) => {
      e.stopPropagation();
    });
  }

  function loadMoodboard() {
    try {
      const saved = localStorage.getItem('capinterest_moodboard_data');
      if (saved) {
        const data = JSON.parse(saved);
        state.moodboard.nodes = data.nodes || [];
        state.moodboard.links = data.links || [];
        state.moodboard.panX = data.panX ?? 0;
        state.moodboard.panY = data.panY ?? 0;
        state.moodboard.zoom = data.zoom ?? 1.0;
      }
    } catch (e) {
      console.error('Failed to load moodboard from localStorage:', e);
    }
  }

  function saveMoodboard() {
    try {
      const data = {
        nodes: state.moodboard.nodes,
        links: state.moodboard.links,
        panX: state.moodboard.panX,
        panY: state.moodboard.panY,
        zoom: state.moodboard.zoom
      };
      localStorage.setItem('capinterest_moodboard_data', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save moodboard to localStorage:', e);
    }
  }

  // Start app
  init();
});

