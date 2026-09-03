/**
 * 희망도서 신청 웹앱 메인 UI 로직
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = {
  currentTab: 'search', // 'search' | 'url' | 'manual'
  selectedBook: null,

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadSavedState();
    this.updateGasUrlStatus();
  },

  cacheElements() {
    // 탭 버튼
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = {
      search: document.getElementById('tab-search-content'),
      url: document.getElementById('tab-url-content'),
      manual: document.getElementById('tab-manual-content')
    };

    // 검색 모드 엘리먼트
    this.searchInput = document.getElementById('search-input');
    this.searchBtn = document.getElementById('search-btn');
    this.searchResultsContainer = document.getElementById('search-results-container');
    this.searchResultsList = document.getElementById('search-results-list');
    this.searchLoading = document.getElementById('search-loading');
    this.searchEmpty = document.getElementById('search-empty');

    // URL 모드 엘리먼트
    this.urlInput = document.getElementById('url-input');
    this.parseUrlBtn = document.getElementById('parse-url-btn');
    this.urlLoading = document.getElementById('url-loading');
    this.urlPreview = document.getElementById('url-preview');

    // 신청 폼 엘리먼트
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

    // 설정 모달 엘리먼트
    this.settingsModal = document.getElementById('settings-modal');
    this.openSettingsBtn = document.getElementById('open-settings-btn');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    this.gasUrlInput = document.getElementById('gas-url-input');
    this.saveGasUrlBtn = document.getElementById('save-gas-url-btn');
    this.testGasUrlBtn = document.getElementById('test-gas-url-btn');
    this.gasUrlStatusBadge = document.getElementById('gas-url-status-badge');
    this.headerStatusBadge = document.getElementById('header-status-badge');

    // 완료 모달
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

    // 설정 모달 제어
    this.openSettingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.saveGasUrlBtn.addEventListener('click', () => this.saveGasUrl());
    this.testGasUrlBtn.addEventListener('click', () => this.testGasConnection());

    // 완료 모달 닫기
    this.closeSuccessBtn.addEventListener('click', () => this.closeSuccessModal());

    // 모달 배경 클릭 시 닫기
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });
    this.successModal.addEventListener('click', (e) => {
      if (e.target === this.successModal) this.closeSuccessModal();
    });
  },

  loadSavedState() {
    // 저장된 신청자명 불러오기
    const savedName = localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICANT_NAME);
    if (savedName) {
      this.applicantInput.value = savedName;
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // 탭 버튼 활성화 스타일
    this.tabButtons.forEach(btn => {
      const isTarget = btn.dataset.tab === tabName;
      if (isTarget) {
        btn.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
        btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
        btn.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
      }
    });

    // 탭 컨텐츠 보이기/숨기기
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
          <button type="button" class="select-book-btn px-4 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-medium text-xs md:text-sm rounded-lg transition-colors flex items-center gap-1.5 shadow-xs">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>선택</span>
          </button>
        </div>
      `;

      // 선택 버튼 클릭 이벤트
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

    // 표지 뱃지
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

    const formData = {
      applicant: applicant,
      title: title,
      author: this.bookAuthorInput.value.trim(),
      publisher: this.bookPublisherInput.value.trim(),
      price: this.bookPriceInput.value.trim(),
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

  // ==========================================
  // 설정 및 GAS URL 관리
  // ==========================================

  openSettings() {
    this.gasUrlInput.value = CONFIG.getGasUrl();
    this.settingsModal.classList.remove('hidden');
    this.settingsModal.classList.add('fade-in');
  },

  closeSettings() {
    this.settingsModal.classList.add('hidden');
  },

  saveGasUrl() {
    const url = this.gasUrlInput.value.trim();
    CONFIG.setGasUrl(url);
    this.updateGasUrlStatus();
    this.showToast('GAS 웹앱 URL 설정이 저장되었습니다.', 'success');
    this.closeSettings();
  },

  async testGasConnection() {
    const url = this.gasUrlInput.value.trim();
    if (!url) {
      this.showToast('테스트할 GAS URL을 입력해주세요.', 'warning');
      return;
    }

    this.testGasUrlBtn.disabled = true;
    this.testGasUrlBtn.textContent = '연결 확인 중...';

    try {
      const res = await ApiService.checkHealth(url);
      this.testGasUrlBtn.disabled = false;
      this.testGasUrlBtn.textContent = '연결 테스트';

      if (res.status === 'success') {
        this.showToast('GAS 웹앱 서버와 성공적으로 연결되었습니다!', 'success');
      } else {
        this.showToast(`연결 응답 오류: ${res.message || '확인 불가'}`, 'error');
      }
    } catch (e) {
      this.testGasUrlBtn.disabled = false;
      this.testGasUrlBtn.textContent = '연결 테스트';
      this.showToast(`연결 실패: ${e.message}`, 'error');
    }
  },

  updateGasUrlStatus() {
    const currentUrl = CONFIG.getGasUrl();
    if (currentUrl) {
      this.headerStatusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-medium text-emerald-700">GAS 연동됨</span>
      `;
      this.headerStatusBadge.className = 'flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full cursor-pointer';
    } else {
      this.headerStatusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="text-xs font-medium text-amber-700">데모 모드</span>
      `;
      this.headerStatusBadge.className = 'flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full cursor-pointer';
    }
  },

  // ==========================================
  // 완료 모달
  // ==========================================

  openSuccessModal(applicant, bookTitle) {
    this.successApplicant.textContent = applicant;
    this.successBookTitle.textContent = bookTitle;
    this.successModal.classList.remove('hidden');
    this.successModal.classList.add('fade-in');
  },

  closeSuccessModal() {
    this.successModal.classList.add('hidden');
  },

  // ==========================================
  // 토스트 알림 헬퍼
  // ==========================================

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
