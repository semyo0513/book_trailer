/**
 * 희망도서 신청 웹앱 메인 UI 및 관리자 모드 로직
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentTab: 'search', // 'search' | 'url' | 'manual'
  adminCurrentTab: 'system', // 'system' | 'service' | 'security'
  selectedBook: null,
  isAdminAuthenticated: false,

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadSavedState();
    this.applyCustomSettingsToUI();
    this.updateGasUrlStatus();
  },

  cacheElements() {
    // 탭 버튼 & 컨텐츠
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = {
      search: document.getElementById('tab-search-content'),
      url: document.getElementById('tab-url-content'),
      manual: document.getElementById('tab-manual-content')
    };

    // 검색 모드
    this.searchInput = document.getElementById('search-input');
    this.searchBtn = document.getElementById('search-btn');
    this.searchResultsContainer = document.getElementById('search-results-container');
    this.searchResultsList = document.getElementById('search-results-list');
    this.searchLoading = document.getElementById('search-loading');
    this.searchEmpty = document.getElementById('search-empty');

    // URL 모드
    this.urlInput = document.getElementById('url-input');
    this.parseUrlBtn = document.getElementById('parse-url-btn');
    this.urlLoading = document.getElementById('url-loading');

    // 신청 폼
    this.requestForm = document.getElementById('request-form');
    this.applicantInput = document.getElementById('applicant-input');
    this.bookTitleInput = document.getElementById('book-title');
    this.bookAuthorInput = document.getElementById('book-author');
    this.bookPublisherInput = document.getElementById('book-publisher');
    this.bookPriceInput = document.getElementById('book-price');
    this.bookMallInput = document.getElementById('book-mall');
    this.bookLinkInput = document.getElementById('book-link');
    this.bookNotesInput = document.getElementById('book-notes');
    this.bookCoverImg = document.getElementById('selected-book-cover');
    this.selectedBookBadge = document.getElementById('selected-book-badge');
    this.submitBtn = document.getElementById('submit-btn');
    this.submitSpinner = document.getElementById('submit-spinner');
    this.submitBtnText = document.getElementById('submit-btn-text');

    // 동적 UI 텍스트 엘리먼트
    this.pageTitle = document.getElementById('page-title');
    this.displayAppTitle = document.getElementById('display-app-title');
    this.displayAppSubtitle = document.getElementById('display-app-subtitle');
    this.displayNoticeBanner = document.getElementById('display-notice-banner');
    this.displayNoticeText = document.getElementById('display-notice-text');
    this.priceLimitHint = document.getElementById('price-limit-hint');
    this.displaySuccessMsg = document.getElementById('display-success-msg');
    this.headerStatusBadge = document.getElementById('header-status-badge');
    this.openSettingsBtn = document.getElementById('open-settings-btn');

    // 관리자 암호 인증 모달
    this.adminAuthModal = document.getElementById('admin-auth-modal');
    this.adminAuthCard = document.getElementById('admin-auth-card');
    this.adminPasswordInput = document.getElementById('admin-password-input');
    this.togglePasswordVisibility = document.getElementById('toggle-password-visibility');
    this.submitAuthBtn = document.getElementById('submit-auth-btn');
    this.cancelAuthBtn = document.getElementById('cancel-auth-btn');
    this.closeAuthModalBtn = document.getElementById('close-auth-modal-btn');

    // 관리자 설정 패널 모달
    this.adminSettingsModal = document.getElementById('admin-settings-modal');
    this.closeSettingsModalBtn = document.getElementById('close-settings-modal-btn');
    this.closeSettingsBottomBtn = document.getElementById('close-settings-bottom-btn');
    this.adminTabButtons = document.querySelectorAll('.admin-tab-btn');
    this.adminTabPanels = {
      system: document.getElementById('admin-tab-system'),
      service: document.getElementById('admin-tab-service'),
      security: document.getElementById('admin-tab-security')
    };

    // 관리자 설정 입력 필드
    this.settingGasUrl = document.getElementById('setting-gas-url');
    this.settingTestGasBtn = document.getElementById('setting-test-gas-btn');
    this.settingSheetUrl = document.getElementById('setting-sheet-url');
    this.openSheetLinkBtn = document.getElementById('open-sheet-link-btn');
    this.settingInitSheetBtn = document.getElementById('setting-init-sheet-btn');

    this.settingAppTitle = document.getElementById('setting-app-title');
    this.settingAppSubtitle = document.getElementById('setting-app-subtitle');
    this.settingMonthlyLimit = document.getElementById('setting-monthly-limit');
    this.settingPriceLimit = document.getElementById('setting-price-limit');
    this.settingNoticeText = document.getElementById('setting-notice-text');
    this.settingSuccessMsg = document.getElementById('setting-success-msg');

    this.settingCurrentPw = document.getElementById('setting-current-pw');
    this.settingNewPw = document.getElementById('setting-new-pw');
    this.settingConfirmPw = document.getElementById('setting-confirm-pw');
    this.settingChangePwBtn = document.getElementById('setting-change-pw-btn');
    this.settingResetAllBtn = document.getElementById('setting-reset-all-btn');
    this.adminLogoutBtn = document.getElementById('admin-logout-btn');
    this.saveAllSettingsBtn = document.getElementById('save-all-settings-btn');

    // 신청 완료 모달
    this.successModal = document.getElementById('success-modal');
    this.closeSuccessBtn = document.getElementById('close-success-btn');
    this.successApplicant = document.getElementById('success-applicant');
    this.successBookTitle = document.getElementById('success-book-title');
  },

  bindEvents() {
    // 탭 전환
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // 검색 이벤트
    this.searchBtn.addEventListener('click', () => this.handleSearch());
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSearch();
      }
    });

    // URL 파싱 이벤트
    this.parseUrlBtn.addEventListener('click', () => this.handleParseUrl());
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleParseUrl();
      }
    });

    // 신청자명 저장
    this.applicantInput.addEventListener('change', () => {
      const name = this.applicantInput.value.trim();
      if (name) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.APPLICANT_NAME, name);
      }
    });

    // 신청서 제출
    this.requestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // ==========================================
    // 관리자 인증 및 설정 모달 이벤트
    // ==========================================
    const openAdminAuth = () => {
      if (this.isAdminAuthenticated) {
        this.openAdminSettings();
      } else {
        this.openAuthModal();
      }
    };

    this.openSettingsBtn.addEventListener('click', openAdminAuth);
    this.headerStatusBadge.addEventListener('click', openAdminAuth);

    this.closeAuthModalBtn.addEventListener('click', () => this.closeAuthModal());
    this.cancelAuthBtn.addEventListener('click', () => this.closeAuthModal());
    this.submitAuthBtn.addEventListener('click', () => this.handleAuthSubmit());
    this.adminPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAuthSubmit();
      }
    });

    // 비밀번호 보기/숨기기 토글
    this.togglePasswordVisibility.addEventListener('click', () => {
      const isPassword = this.adminPasswordInput.type === 'password';
      this.adminPasswordInput.type = isPassword ? 'text' : 'password';
    });

    // 관리자 패널 탭 전환
    this.adminTabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.adminTab;
        this.switchAdminTab(tab);
      });
    });

    // 관리자 패널 닫기
    this.closeSettingsModalBtn.addEventListener('click', () => this.closeAdminSettings());
    this.closeSettingsBottomBtn.addEventListener('click', () => this.closeAdminSettings());

    // 관리자 패널 액션들
    this.settingTestGasBtn.addEventListener('click', () => this.testGasConnection());
    this.openSheetLinkBtn.addEventListener('click', () => this.openGoogleSheet());
    this.settingInitSheetBtn.addEventListener('click', () => this.handleInitSheetHeaders());
    this.settingChangePwBtn.addEventListener('click', () => this.handleChangeAdminPassword());
    this.settingResetAllBtn.addEventListener('click', () => this.handleResetAllSettings());
    this.adminLogoutBtn.addEventListener('click', () => this.handleAdminLogout());
    this.saveAllSettingsBtn.addEventListener('click', () => this.handleSaveAllSettings());

    // 완료 모달 닫기
    this.closeSuccessBtn.addEventListener('click', () => this.closeSuccessModal());

    // 배경 클릭 시 모달 닫기
    this.adminAuthModal.addEventListener('click', (e) => {
      if (e.target === this.adminAuthModal) this.closeAuthModal();
    });
    this.adminSettingsModal.addEventListener('click', (e) => {
      if (e.target === this.adminSettingsModal) this.closeAdminSettings();
    });
    this.successModal.addEventListener('click', (e) => {
      if (e.target === this.successModal) this.closeSuccessModal();
    });
  },

  loadSavedState() {
    const savedName = localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICANT_NAME);
    if (savedName) {
      this.applicantInput.value = savedName;
    }
  },

  // ==========================================
  // 관리자 커스텀 설정 적용
  // ==========================================
  applyCustomSettingsToUI() {
    const settings = CONFIG.getSettings();

    // 타이틀 & 부제목
    if (this.pageTitle) this.pageTitle.textContent = `${settings.appTitle} 서비스`;
    if (this.displayAppTitle) this.displayAppTitle.textContent = settings.appTitle;
    if (this.displayAppSubtitle) this.displayAppSubtitle.textContent = settings.appSubtitle;

    // 공지 배너
    if (settings.noticeText && settings.noticeText.trim() !== '') {
      this.displayNoticeText.textContent = settings.noticeText;
      this.displayNoticeBanner.classList.remove('hidden');
    } else {
      this.displayNoticeBanner.classList.add('hidden');
    }

    // 금액 상한 힌트
    if (settings.priceLimit && Number(settings.priceLimit) > 0) {
      this.priceLimitHint.textContent = `(권장 상한: ${Number(settings.priceLimit).toLocaleString('ko-KR')}원)`;
    } else {
      this.priceLimitHint.textContent = '';
    }

    // 완료 메시지
    if (this.displaySuccessMsg) {
      this.displaySuccessMsg.textContent = settings.successMessage || '구글 시트에 성공적으로 등록되었습니다.';
    }
  },

  // ==========================================
  // 관리자 인증 모달 제어
  // ==========================================
  openAuthModal() {
    this.adminPasswordInput.value = '';
    this.adminPasswordInput.type = 'password';
    this.adminAuthModal.classList.remove('hidden');
    this.adminAuthModal.classList.add('fade-in');
    setTimeout(() => this.adminPasswordInput.focus(), 100);
  },

  closeAuthModal() {
    this.adminAuthModal.classList.add('hidden');
  },

  handleAuthSubmit() {
    const password = this.adminPasswordInput.value;
    if (CONFIG.verifyAdminPassword(password)) {
      this.isAdminAuthenticated = true;
      this.closeAuthModal();
      this.openAdminSettings();
      this.showToast('관리자 인증에 성공했습니다.', 'success');
    } else {
      this.adminAuthCard.classList.remove('shake');
      void this.adminAuthCard.offsetWidth; // 트리거 리플로우
      this.adminAuthCard.classList.add('shake');
      this.showToast('관리자 암호가 일치하지 않습니다.', 'error');
      this.adminPasswordInput.select();
    }
  },

  // ==========================================
  // 관리자 설정 패널 제어
  // ==========================================
  openAdminSettings() {
    this.loadAdminSettingsIntoForm();
    this.switchAdminTab('system');
    this.adminSettingsModal.classList.remove('hidden');
    this.adminSettingsModal.classList.add('fade-in');
  },

  closeAdminSettings() {
    this.adminSettingsModal.classList.add('hidden');
  },

  switchAdminTab(tabName) {
    this.adminCurrentTab = tabName;

    this.adminTabButtons.forEach(btn => {
      const isTarget = btn.dataset.adminTab === tabName;
      if (isTarget) {
        btn.className = 'admin-tab-btn py-2 px-3 rounded-lg transition-all bg-white text-blue-600 shadow-2xs';
      } else {
        btn.className = 'admin-tab-btn py-2 px-3 rounded-lg transition-all text-slate-600 hover:text-slate-900';
      }
    });

    Object.keys(this.adminTabPanels).forEach(key => {
      if (key === tabName) {
        this.adminTabPanels[key].classList.remove('hidden');
      } else {
        this.adminTabPanels[key].classList.add('hidden');
      }
    });
  },

  loadAdminSettingsIntoForm() {
    const settings = CONFIG.getSettings();

    this.settingGasUrl.value = CONFIG.getGasUrl();
    this.settingSheetUrl.value = settings.sheetUrl || '';
    this.settingAppTitle.value = settings.appTitle || '';
    this.settingAppSubtitle.value = settings.appSubtitle || '';
    this.settingMonthlyLimit.value = settings.monthlyLimit || '';
    this.settingPriceLimit.value = settings.priceLimit || '';
    this.settingNoticeText.value = settings.noticeText || '';
    this.settingSuccessMsg.value = settings.successMessage || '';

    // 비밀번호 필드 초기화
    this.settingCurrentPw.value = '';
    this.settingNewPw.value = '';
    this.settingConfirmPw.value = '';
  },

  async handleSaveAllSettings() {
    const gasUrl = this.settingGasUrl.value.trim();
    CONFIG.setGasUrl(gasUrl);

    const updatedSettings = {
      sheetUrl: this.settingSheetUrl.value.trim(),
      appTitle: this.settingAppTitle.value.trim() || CONFIG.DEFAULT_SETTINGS.appTitle,
      appSubtitle: this.settingAppSubtitle.value.trim(),
      monthlyLimit: this.settingMonthlyLimit.value.trim(),
      priceLimit: this.settingPriceLimit.value.trim(),
      noticeText: this.settingNoticeText.value.trim(),
      successMessage: this.settingSuccessMsg.value.trim()
    };

    CONFIG.saveSettings(updatedSettings);
    this.applyCustomSettingsToUI();
    this.updateGasUrlStatus();
    this.showToast('모든 관리자 설정이 성공적으로 저장 및 적용되었습니다.', 'success');
    this.closeAdminSettings();
  },

  async testGasConnection() {
    const url = this.settingGasUrl.value.trim();
    if (!url) {
      this.showToast('테스트할 GAS URL을 입력해주세요.', 'warning');
      return;
    }

    this.settingTestGasBtn.disabled = true;
    this.settingTestGasBtn.textContent = '확인 중...';

    try {
      const res = await ApiService.checkHealth(url);
      this.settingTestGasBtn.disabled = false;
      this.settingTestGasBtn.textContent = '연결 테스트';

      if (res.status === 'success') {
        this.showToast('GAS 웹앱 서버와 정상적으로 연결되었습니다!', 'success');
      } else {
        this.showToast(`연결 응답: ${res.message || '오류'}`, 'error');
      }
    } catch (e) {
      this.settingTestGasBtn.disabled = false;
      this.settingTestGasBtn.textContent = '연결 테스트';
      this.showToast(`연결 실패: ${e.message}`, 'error');
    }
  },

  openGoogleSheet() {
    const sheetUrl = this.settingSheetUrl.value.trim() || CONFIG.getSettings().sheetUrl;
    if (!sheetUrl) {
      this.showToast('등록된 구글 스프레드시트 링크가 없습니다.', 'warning');
      return;
    }
    window.open(sheetUrl, '_blank');
  },

  async handleInitSheetHeaders() {
    if (!confirm('구글 시트에 헤더([신청일시, 신청자명, ...])를 강제 생성하시겠습니까?')) {
      return;
    }

    this.settingInitSheetBtn.disabled = true;
    this.settingInitSheetBtn.textContent = '요청 중...';

    try {
      const res = await ApiService.initSheetHeaders();
      this.settingInitSheetBtn.disabled = false;
      this.settingInitSheetBtn.textContent = '헤더 강제 생성';

      if (res.status === 'success') {
        this.showToast(res.message || '시트 헤더 생성이 완료되었습니다.', 'success');
      } else {
        this.showToast(res.message || '헤더 생성 실패', 'error');
      }
    } catch (e) {
      this.settingInitSheetBtn.disabled = false;
      this.settingInitSheetBtn.textContent = '헤더 강제 생성';
      this.showToast(`요청 실패: ${e.message}`, 'error');
    }
  },

  handleChangeAdminPassword() {
    const currentPw = this.settingCurrentPw.value;
    const newPw = this.settingNewPw.value.trim();
    const confirmPw = this.settingConfirmPw.value.trim();

    if (!CONFIG.verifyAdminPassword(currentPw)) {
      this.showToast('현재 관리자 비밀번호가 일치하지 않습니다.', 'error');
      this.settingCurrentPw.focus();
      return;
    }

    if (newPw.length < 4) {
      this.showToast('새 비밀번호는 최소 4자 이상이어야 합니다.', 'warning');
      this.settingNewPw.focus();
      return;
    }

    if (newPw !== confirmPw) {
      this.showToast('새 비밀번호 확인이 일치하지 않습니다.', 'error');
      this.settingConfirmPw.focus();
      return;
    }

    CONFIG.setAdminPassword(newPw);
    this.settingCurrentPw.value = '';
    this.settingNewPw.value = '';
    this.settingConfirmPw.value = '';
    this.showToast('관리자 비밀번호가 안전하게 변경되었습니다.', 'success');
  },

  handleResetAllSettings() {
    if (confirm('정말로 모든 설정과 관리자 비밀번호를 기본값(admin1234)으로 초기화하시겠습니까?')) {
      CONFIG.resetAllSettings();
      this.isAdminAuthenticated = false;
      this.applyCustomSettingsToUI();
      this.updateGasUrlStatus();
      this.closeAdminSettings();
      this.showToast('모든 설정이 초기화되었습니다. 기본 암호는 admin1234 입니다.', 'info');
    }
  },

  handleAdminLogout() {
    this.isAdminAuthenticated = false;
    this.closeAdminSettings();
    this.showToast('관리자 모드에서 로그아웃되었습니다.', 'info');
  },

  updateGasUrlStatus() {
    const currentUrl = CONFIG.getGasUrl();
    if (currentUrl) {
      this.headerStatusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-medium text-emerald-700">GAS 연동됨</span>
      `;
      this.headerStatusBadge.className = 'flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors';
    } else {
      this.headerStatusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="text-xs font-medium text-amber-700">데모 모드</span>
      `;
      this.headerStatusBadge.className = 'flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full cursor-pointer hover:bg-amber-100 transition-colors';
    }
  },

  // ==========================================
  // 일반 도서 검색 / URL 파싱 / 신청 폼 로직
  // ==========================================
  switchTab(tabName) {
    this.currentTab = tabName;

    this.tabButtons.forEach(btn => {
      const isTarget = btn.dataset.tab === tabName;
      if (isTarget) {
        btn.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
        btn.classList.add('bg-blue-600', 'text-white', 'shadow-xs');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-xs');
        btn.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
      }
    });

    Object.keys(this.tabContents).forEach(key => {
      if (key === tabName) {
        this.tabContents[key].classList.remove('hidden');
        this.tabContents[key].classList.add('fade-in');
      } else {
        this.tabContents[key].classList.add('hidden');
        this.tabContents[key].classList.remove('fade-in');
      }
    });

    if (tabName === 'manual') {
      this.showToast('도서 정보를 직접 입력해주세요.', 'info');
    }
  },

  async handleSearch() {
    const query = this.searchInput.value.trim();
    if (!query) {
      this.showToast('검색할 도서명 또는 저자명을 입력해주세요.', 'warning');
      this.searchInput.focus();
      return;
    }

    this.searchLoading.classList.remove('hidden');
    this.searchResultsContainer.classList.add('hidden');
    this.searchEmpty.classList.add('hidden');
    this.searchResultsList.innerHTML = '';

    try {
      const response = await ApiService.searchBooks(query);
      this.searchLoading.classList.add('hidden');

      if (response.status === 'success' || response.status === 'mock') {
        const items = response.items || [];
        if (items.length === 0) {
          this.searchEmpty.classList.remove('hidden');
          return;
        }

        this.renderSearchResults(items);
        this.searchResultsContainer.classList.remove('hidden');
        this.searchResultsContainer.classList.add('fade-in');

        if (response.isMock || response.status === 'mock') {
          this.showToast('알라딘 TTB 키 미설정 상태로 샘플 데이터가 표시됩니다.', 'info');
        }
      } else {
        this.showToast(response.message || '도서 검색에 실패했습니다.', 'error');
      }
    } catch (err) {
      this.searchLoading.classList.add('hidden');
      this.showToast(err.message, 'error');
    }
  },

  renderSearchResults(items) {
    this.searchResultsList.innerHTML = '';

    items.forEach((book) => {
      const card = document.createElement('div');
      card.className = 'book-card bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-center justify-between shadow-xs';

      const coverSrc = book.cover || 'https://via.placeholder.com/120x160?text=No+Cover';
      const formattedPrice = book.priceSales || book.priceStandard 
        ? `${Number(book.priceSales || book.priceStandard).toLocaleString('ko-KR')}원` 
        : '가격 미제공';

      card.innerHTML = `
        <div class="flex items-center gap-4 flex-1 min-w-0">
          <div class="w-16 h-22 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden shadow-inner flex items-center justify-center">
            <img src="${coverSrc}" alt="${this.escapeHtml(book.title)}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/120x160?text=No+Image'">
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">${book.mallName || '알라딘'}</span>
              ${book.isbn ? `<span class="text-xs text-gray-400">ISBN: ${book.isbn}</span>` : ''}
            </div>
            <h4 class="font-bold text-gray-900 text-sm md:text-base line-clamp-1" title="${this.escapeHtml(book.title)}">
              ${this.escapeHtml(book.title)}
            </h4>
            <p class="text-xs text-gray-600 line-clamp-1 mt-0.5">
              ${this.escapeHtml(book.author || '저자 미상')} | ${this.escapeHtml(book.publisher || '출판사 미상')}
            </p>
            <p class="text-xs font-semibold text-blue-600 mt-1">
              ${formattedPrice}
            </p>
          </div>
        </div>
        <div class="flex-shrink-0 ml-2">
          <button type="button" class="select-book-btn px-4 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-medium text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>선택</span>
          </button>
        </div>
      `;

      const selectBtn = card.querySelector('.select-book-btn');
      selectBtn.addEventListener('click', () => {
        this.fillFormWithBook(book);
        this.showToast(`'${book.title}' 도서가 선택되었습니다.`, 'success');
        this.scrollToForm();
      });

      this.searchResultsList.appendChild(card);
    });
  },

  async handleParseUrl() {
    const url = this.urlInput.value.trim();
    if (!url) {
      this.showToast('서점 상품 링크(URL)를 입력해주세요.', 'warning');
      this.urlInput.focus();
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.showToast('올바른 웹 주소(URL) 형식이 아닙니다.', 'warning');
      return;
    }

    this.urlLoading.classList.remove('hidden');
    this.parseUrlBtn.disabled = true;

    try {
      const response = await ApiService.parseBookUrl(url);
      this.urlLoading.classList.add('hidden');
      this.parseUrlBtn.disabled = false;

      if (response.status === 'success' || response.status === 'partial' || response.isMock) {
        const item = response.item;
        this.fillFormWithBook(item);
        this.showToast('도서 정보가 성공적으로 추출되었습니다.', 'success');
        this.scrollToForm();
      } else {
        this.showToast(response.message || '도서 정보 추출에 실패했습니다. 직접 입력해주세요.', 'error');
      }
    } catch (err) {
      this.urlLoading.classList.add('hidden');
      this.parseUrlBtn.disabled = false;
      this.showToast(err.message, 'error');
    }
  },

  fillFormWithBook(book) {
    this.selectedBook = book;

    this.bookTitleInput.value = book.title || '';
    this.bookAuthorInput.value = book.author || '';
    this.bookPublisherInput.value = book.publisher || '';
    this.bookPriceInput.value = book.priceSales || book.priceStandard || book.price || '';
    this.bookMallInput.value = book.mallName || '기타';
    this.bookLinkInput.value = book.link || '';

    if (book.cover) {
      this.bookCoverImg.src = book.cover;
      this.selectedBookBadge.classList.remove('hidden');
    } else {
      this.selectedBookBadge.classList.add('hidden');
    }
  },

  scrollToForm() {
    const formSection = document.getElementById('form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  async handleSubmit() {
    const applicant = this.applicantInput.value.trim();
    const title = this.bookTitleInput.value.trim();
    const price = Number(this.bookPriceInput.value.trim()) || 0;

    if (!applicant) {
      this.showToast('신청자 이름을 입력해주세요.', 'warning');
      this.applicantInput.focus();
      return;
    }

    if (!title) {
      this.showToast('도서명을 입력해주세요.', 'warning');
      this.bookTitleInput.focus();
      return;
    }

    // 관리자 예산 상한선 검증 경고
    const settings = CONFIG.getSettings();
    if (settings.priceLimit && Number(settings.priceLimit) > 0 && price > Number(settings.priceLimit)) {
      if (!confirm(`신청 도서 가격(${price.toLocaleString('ko-KR')}원)이 권장 상한 금액(${Number(settings.priceLimit).toLocaleString('ko-KR')}원)을 초과합니다. 그래도 신청하시겠습니까?`)) {
        return;
      }
    }

    const formData = {
      applicant: applicant,
      title: title,
      author: this.bookAuthorInput.value.trim(),
      publisher: this.bookPublisherInput.value.trim(),
      price: price,
      mallName: this.bookMallInput.value.trim(),
      link: this.bookLinkInput.value.trim(),
      notes: this.bookNotesInput.value.trim()
    };

    this.setSubmitting(true);

    try {
      const result = await ApiService.submitBookRequest(formData);
      this.setSubmitting(false);

      if (result.status === 'success' || result.status === 'mock_success') {
        this.openSuccessModal(applicant, title);
        this.resetBookFields();
      } else {
        this.showToast(result.message || '신청 접수에 실패했습니다.', 'error');
      }
    } catch (err) {
      this.setSubmitting(false);
      this.showToast(err.message, 'error');
    }
  },

  setSubmitting(isSubmitting) {
    if (isSubmitting) {
      this.submitBtn.disabled = true;
      this.submitSpinner.classList.remove('hidden');
      this.submitBtnText.textContent = '신청서 접수 중...';
    } else {
      this.submitBtn.disabled = false;
      this.submitSpinner.classList.add('hidden');
      this.submitBtnText.textContent = '희망도서 신청하기';
    }
  },

  resetBookFields() {
    this.bookTitleInput.value = '';
    this.bookAuthorInput.value = '';
    this.bookPublisherInput.value = '';
    this.bookPriceInput.value = '';
    this.bookMallInput.value = '알라딘';
    this.bookLinkInput.value = '';
    this.bookNotesInput.value = '';
    this.selectedBookBadge.classList.add('hidden');
    this.selectedBook = null;
    this.searchInput.value = '';
    this.searchResultsContainer.classList.add('hidden');
    this.urlInput.value = '';
  },

  openSuccessModal(applicant, bookTitle) {
    this.successApplicant.textContent = applicant;
    this.successBookTitle.textContent = bookTitle;
    this.successModal.classList.remove('hidden');
    this.successModal.classList.add('fade-in');
  },

  closeSuccessModal() {
    this.successModal.classList.add('hidden');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast flex items-center gap-3 p-4 rounded-xl border bg-white shadow-lg';

    let iconHtml = '';
    let borderClass = 'border-gray-200';

    if (type === 'success') {
      borderClass = 'border-emerald-200';
      iconHtml = `
        <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
        </div>
      `;
    } else if (type === 'error') {
      borderClass = 'border-rose-200';
      iconHtml = `
        <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
      `;
    } else if (type === 'warning') {
      borderClass = 'border-amber-200';
      iconHtml = `
        <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
      `;
    } else {
      borderClass = 'border-blue-200';
      iconHtml = `
        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
      `;
    }

    toast.classList.add(borderClass);
    toast.innerHTML = `
      ${iconHtml}
      <div class="flex-1 text-sm text-gray-800 font-medium leading-snug">${this.escapeHtml(message)}</div>
      <button type="button" class="text-gray-400 hover:text-gray-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    container.appendChild(toast);

    setTimeout(() => {
      this.removeToast(toast);
    }, 4000);
  },

  removeToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
