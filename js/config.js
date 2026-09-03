/**
 * 애플리케이션 설정
 */
const CONFIG = {
  // Google Apps Script 웹앱 배포 URL
  DEFAULT_GAS_URL: 'https://script.google.com/macros/s/AKfycbzZEEPyVMjqj2aXtJaPmAyi0hFVNftnbPIsbHkXJPu9cje2Rf4dUx-IVU5i7fRJuR9M/exec',

  // LocalStorage 키
  STORAGE_KEYS: {
    GAS_URL: 'wishbook_gas_url',
    APPLICANT_NAME: 'wishbook_applicant_name',
    THEME: 'wishbook_theme'
  },

  // 현재 활성화된 GAS URL 반환
  getGasUrl() {
    const saved = localStorage.getItem(this.STORAGE_KEYS.GAS_URL);
    return saved && saved.trim() !== '' ? saved.trim() : this.DEFAULT_GAS_URL;
  },

  // GAS URL 저장
  setGasUrl(url) {
    if (url) {
      localStorage.setItem(this.STORAGE_KEYS.GAS_URL, url.trim());
    } else {
      localStorage.removeItem(this.STORAGE_KEYS.GAS_URL);
    }
  }
};
