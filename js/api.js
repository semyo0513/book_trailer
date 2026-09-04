/**
 * Google Apps Script 백엔드 통신 API 클라이언트
 */
const ApiService = {
  /**
   * 도서 키워드 검색
   * @param {string} query 검색어
   * @returns {Promise<{status: string, items?: Array, message?: string}>}
   */
  async searchBooks(query) {
    const gasUrl = CONFIG.getGasUrl();
    if (!gasUrl) {
      console.warn('GAS URL 미설정: 데모 Mock 데이터로 응답합니다.');
      return this.getMockSearchResults(query);
    }

    try {
      const targetUrl = new URL(gasUrl);
      targetUrl.searchParams.set('action', 'search');
      targetUrl.searchParams.set('query', query);

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('searchBooks error:', error);
      throw new Error(`도서 검색 중 오류가 발생했습니다: ${error.message}`);
    }
  },

  /**
   * 서점 URL 도서정보 파싱
   * @param {string} url 서점 상품 링크
   * @returns {Promise<{status: string, item?: Object, message?: string}>}
   */
  async parseBookUrl(url) {
    const gasUrl = CONFIG.getGasUrl();
    if (!gasUrl) {
      console.warn('GAS URL 미설정: 데모 Mock URL 파싱으로 응답합니다.');
      return this.getMockParsedUrl(url);
    }

    try {
      const targetUrl = new URL(gasUrl);
      targetUrl.searchParams.set('action', 'parseUrl');
      targetUrl.searchParams.set('url', url);

      const response = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('parseBookUrl error:', error);
      throw new Error(`URL 분석 중 오류가 발생했습니다: ${error.message}`);
    }
  },

  /**
   * 희망도서 신청서 제출 (Google Sheets 저장)
   * @param {Object} formData { applicant, title, author, publisher, price, mallName, link, notes }
   * @returns {Promise<{status: string, message?: string, data?: Object}>}
   */
  async submitBookRequest(formData) {
    const gasUrl = CONFIG.getGasUrl();
    if (!gasUrl) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        status: 'mock_success',
        message: '[데모 모드] 신청이 가상 접수되었습니다. (실제 저장을 위해 설정에서 GAS Web App URL을 등록해주세요.)',
        data: {
          timestamp: new Date().toLocaleString('ko-KR'),
          applicant: formData.applicant,
          title: formData.title
        }
      };
    }

    try {
      const payload = {
        action: 'submit',
        ...formData
      };

      // GAS CORS 대응: Content-Type text/plain 사용
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('submitBookRequest error:', error);
      throw new Error(`신청 저장 중 오류가 발생했습니다: ${error.message}`);
    }
  },

  /**
   * GAS 웹앱 헬스체크
   */
  async checkHealth(url) {
    const target = url || CONFIG.getGasUrl();
    if (!target) return { status: 'error', message: 'URL이 비어 있습니다.' };

    try {
      const checkUrl = new URL(target);
      checkUrl.searchParams.set('action', 'health');
      const response = await fetch(checkUrl.toString(), { method: 'GET' });
      const data = await response.json();
      return data;
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  },

  /**
   * 시트 헤더 초기화 트리거 (관리자 기능)
   */
  async initSheetHeaders() {
    const gasUrl = CONFIG.getGasUrl();
    if (!gasUrl) {
      return { status: 'error', message: 'GAS URL이 설정되지 않았습니다.' };
    }

    try {
      const targetUrl = new URL(gasUrl);
      targetUrl.searchParams.set('action', 'initSheet');
      const response = await fetch(targetUrl.toString(), { method: 'GET' });
      const data = await response.json();
      return data;
    } catch (e) {
      return { status: 'error', message: `헤더 초기화 요청 실패: ${e.message}` };
    }
  },

  /**
   * Mock 검색 결과 생성기
   */
  getMockSearchResults(query) {
    const samples = [
      {
        title: `${query} 완벽 가이드 : 기초부터 실전까지`,
        author: '김철수 (지은이)',
        publisher: '한빛미디어',
        priceStandard: 28000,
        priceSales: 25200,
        cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&q=80',
        link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=99999901',
        isbn: '9788968480011',
        mallName: '알라딘'
      },
      {
        title: `모두를 위한 ${query} 이야기`,
        author: '이영희 (지은이), 박민수 (옮긴이)',
        publisher: '인사이트',
        priceStandard: 22000,
        priceSales: 19800,
        cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&q=80',
        link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=99999902',
        isbn: '9788968480022',
        mallName: '알라딘'
      },
      {
        title: `${query}와 미래 트렌드 2026`,
        author: '최지훈, 정다은 (지은이)',
        publisher: '위키북스',
        priceStandard: 19500,
        priceSales: 17550,
        cover: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?w=300&q=80',
        link: 'https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=99999903',
        isbn: '9788968480033',
        mallName: '알라딘'
      }
    ];

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          status: 'success',
          isMock: true,
          message: '데모 모드로 동작 중입니다.',
          items: samples
        });
      }, 400);
    });
  },

  /**
   * Mock URL 파싱 결과 생성기
   */
  getMockParsedUrl(url) {
    let mall = '기타';
    if (url.includes('aladin.co.kr')) mall = '알라딘';
    else if (url.includes('kyobobook.co.kr')) mall = '교보문고';
    else if (url.includes('yes24.com')) mall = 'YES24';

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          status: 'success',
          isMock: true,
          item: {
            title: 'URL에서 추출된 도서명 예시',
            author: '추출된 저자명',
            publisher: '추출된 출판사',
            price: 24000,
            mallName: mall,
            link: url,
            cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80',
            isbn: '9788900001234'
          }
        });
      }, 500);
    });
  }
};
