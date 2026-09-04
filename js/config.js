/**
 * 애플리케이션 설정 및 관리자 옵션 관리
 */
const CONFIG = {
  // Google Apps Script 웹앱 배포 기본 URL
  DEFAULT_GAS_URL: 'https://script.google.com/macros/s/AKfycbzZEEPyVMjqj2aXtJaPmAyi0hFVNftnbPIsbHkXJPu9cje2Rf4dUx-IVU5i7fRJuR9M/exec',

  // 기본 관리자 비밀번호
  DEFAULT_ADMIN_PASSWORD: 'admin1234',

  // 기본 서비스 텍스트 & 운영 규칙
  DEFAULT_SETTINGS: {
    appTitle: '희망도서 신청',
    appSubtitle: '읽고 싶은 책을 간편하게 검색하고 신청하세요',
    sheetUrl: '',
    monthlyLimit: '3', // 권장 월간 신청 권수 (0이면 제한없음)
    priceLimit: '50000', // 1권당 권장 상한 금액 (0이면 제한없음)
    noticeText: '💡 1인당 월 최대 3권, 권당 5만원 이내의 도서를 권장합니다.',
    successMessage: '구글 시트에 성공적으로 등록되었습니다.'
  },

  // LocalStorage 키 정의
  STORAGE_KEYS: {
    GAS_URL: 'wishbook_gas_url',
    APPLICANT_NAME: 'wishbook_applicant_name',
    ADMIN_PASSWORD: 'wishbook_admin_password',
    APP_SETTINGS: 'wishbook_app_settings'
  },

  // GAS Web App URL 가져오기
  getGasUrl() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.GAS_URL);
    return saved && saved.trim() !== '' ? saved.trim() : this.DEFAULT_GAS_URL;
  },

  // GAS Web App URL 저장
  setGasUrl(url) {
    if (url) {
      localStorage.setItem(this.STORAGE_KEYS.GAS_URL, url.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.GAS_URL);
    }
  },

  // 관리자 비밀번호 확인
  verifyAdminPassword(inputPassword) {
    const savedPassword = localStorage.getItem(this.STORAGE_KEYS.ADMIN_PASSWORD) || this.DEFAULT_ADMIN_PASSWORD;
    return inputPassword === savedPassword;
  },

  // 관리자 비밀번호 변경
  setAdminPassword(newPassword) {
    if (newPassword && newPassword.trim() !== '') {
      localStorage.setItem(this.STORAGE_KEYS.ADMIN_PASSWORD, newPassword.trim());
      return true;
    }
    return false;
  },

  // 관리자 커스텀 설정 불러오기
  getSettings() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEYS.APP_SETTINGS);
      if (saved) {
        return { ...this.DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('설정 불러오기 실패:', e);
    }
    return { ...this.DEFAULT_SETTINGS };
  },

  // 관리자 커스텀 설정 저장
  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.STORAGE_KEYS.APP_SETTINGS, JSON.stringify(updated));
    return updated;
  },

  // 모든 설정을 기본값으로 초기화
  resetAllSettings() {
    localStorage.removeItem(this.STORAGE_KEYS.APP_SETTINGS);
    localStorage.removeItem(this.STORAGE_KEYS.ADMIN_PASSWORD);
    localStorage.removeItem(this.STORAGE_KEYS.GAS_URL);
  }
};
