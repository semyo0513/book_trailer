/**
 * 희망도서 신청 웹앱 - Google Apps Script (Code.gs)
 * 
 * 기능:
 * 1. 도서 검색 프록시 (알라딘 Open API)
 * 2. 서점 URL 도서정보 파싱 (알라딘 / 교보문고 / YES24 등)
 * 3. 희망도서 신청 저장 (Google Sheets '희망도서신청' 탭 appendRow)
 * 4. 환경설정 관리 (Google Sheets '환경설정' 탭 동기화)
 * 5. 관리자 암호 검증 및 변경
 */

// ==========================================
// 1. 엔드포인트 핸들러 (doGet & doPost)
// ==========================================

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var action = params.action || 'health';

    if (action === 'health') {
      return createJsonResponse({ status: 'success', message: 'GAS 희망도서 웹앱 서버 정상 동작 중' });
    } else if (action === 'getSettings') {
      var settings = loadConfigFromSheet();
      return createJsonResponse({ status: 'success', settings: settings });
    } else if (action === 'search') {
      var query = params.query || '';
      var maxResults = params.maxResults ? parseInt(params.maxResults, 10) : 10;
      var results = searchBooks(query, maxResults);
      return createJsonResponse(results);
    } else if (action === 'parseUrl') {
      var url = params.url || '';
      var parsed = parseBookUrl(url);
      return createJsonResponse(parsed);
    } else if (action === 'initSheet') {
      initAllSheets();
      return createJsonResponse({ status: 'success', message: '시트 헤더 및 환경설정이 초기화되었습니다.' });
    } else {
      return createJsonResponse({ status: 'error', message: '알 수 없는 GET action입니다: ' + action });
    }
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    var data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    } else {
      return createJsonResponse({ status: 'error', message: '전달된 데이터가 없습니다.' });
    }

    var action = data.action || (e.parameter ? e.parameter.action : 'submit');

    if (action === 'submit') {
      var result = saveBookRequest(data);
      return createJsonResponse(result);
    } else if (action === 'getSettings') {
      var settings = loadConfigFromSheet();
      return createJsonResponse({ status: 'success', settings: settings });
    } else if (action === 'saveSettings') {
      var saveRes = saveConfigToSheet(data.settings || {});
      return createJsonResponse(saveRes);
    } else if (action === 'verifyAdmin') {
      var isValid = verifyAdminPasswordInSheet(data.password || '');
      return createJsonResponse({ status: 'success', valid: isValid });
    } else if (action === 'changeAdminPassword') {
      var changeRes = changeAdminPasswordInSheet(data.currentPassword || '', data.newPassword || '');
      return createJsonResponse(changeRes);
    } else if (action === 'search') {
      var results = searchBooks(data.query || '', data.maxResults || 10);
      return createJsonResponse(results);
    } else if (action === 'parseUrl') {
      var parsed = parseBookUrl(data.url || '');
      return createJsonResponse(parsed);
    } else {
      return createJsonResponse({ status: 'error', message: '알 수 없는 POST action입니다: ' + action });
    }
  } catch (err) {
    return createJsonResponse({ status: 'error', message: '요청 처리 중 오류 발생: ' + err.toString() });
  }
}

// ==========================================
// 2. 환경설정 시트 ('환경설정' 탭) 관리 로직
// ==========================================

var DEFAULT_CONFIG = {
  appTitle: '희망도서 신청',
  appSubtitle: '읽고 싶은 책을 간편하게 검색하고 신청하세요',
  noticeText: '📢 1인당 월 최대 3권, 권당 5만원 이내의 도서를 권장합니다.',
  monthlyLimit: '3',
  priceLimit: '50000',
  sheetUrl: '',
  successMessage: '구글 시트에 성공적으로 등록되었습니다.',
  adminPassword: 'admin1234'
};

var CONFIG_DESCRIPTIONS = {
  appTitle: '웹앱 상단 메인 타이틀',
  appSubtitle: '웹앱 상단 부제목',
  noticeText: '메인 상단 공지 배너 문구',
  monthlyLimit: '월간 1인당 권장 신청 권수',
  priceLimit: '1권당 권장 상한 금액(원)',
  sheetUrl: '관리자 구글 스프레드시트 링크',
  successMessage: '신청 완료 팝업 메시지',
  adminPassword: '관리자 인증 비밀번호'
};

function getOrCreateConfigSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('환경설정');
  
  if (!sheet) {
    sheet = ss.insertSheet('환경설정');
    initConfigSheetHeaders(sheet);
  } else if (sheet.getLastRow() === 0) {
    initConfigSheetHeaders(sheet);
  }
  
  return sheet;
}

function initConfigSheetHeaders(sheet) {
  sheet.clear();
  sheet.appendRow(['설정 키 (Key)', '설정 값 (Value)', '설명 (Description)']);
  
  var headerRange = sheet.getRange(1, 1, 1, 3);
  headerRange.setBackground('#4F46E5');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  var ssUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var keys = Object.keys(DEFAULT_CONFIG);
  
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var val = (k === 'sheetUrl') ? ssUrl : DEFAULT_CONFIG[k];
    var desc = CONFIG_DESCRIPTIONS[k] || '';
    sheet.appendRow([k, val, desc]);
  }

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 350);
  sheet.setColumnWidth(3, 250);
}

function loadConfigFromSheet() {
  var sheet = getOrCreateConfigSheet();
  var data = sheet.getDataRange().getValues();
  var config = {};
  
  // 기본값으로 먼저 채움
  var keys = Object.keys(DEFAULT_CONFIG);
  for (var i = 0; i < keys.length; i++) {
    config[keys[i]] = DEFAULT_CONFIG[keys[i]];
  }

  // 시트의 데이터 읽기 (1행 헤더 제외)
  for (var r = 1; r < data.length; r++) {
    var key = String(data[r][0]).trim();
    var val = data[r][1] !== undefined ? String(data[r][1]).trim() : '';
    if (key) {
      config[key] = val;
    }
  }

  // 스프레드시트 URL이 비어있으면 현재 시트 URL 자동 설정
  if (!config.sheetUrl) {
    config.sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  }

  return config;
}

function saveConfigToSheet(newConfig) {
  if (!newConfig || typeof newConfig !== 'object') {
    return { status: 'error', message: '저장할 설정 객체가 올바르지 않습니다.' };
  }

  var sheet = getOrCreateConfigSheet();
  var data = sheet.getDataRange().getValues();
  var existingKeys = {};

  // 기존 키의 행 위치 맵핑
  for (var r = 1; r < data.length; r++) {
    var k = String(data[r][0]).trim();
    if (k) existingKeys[k] = r + 1; // 1-indexed row
  }

  // 업데이트할 키 반복
  var targetKeys = Object.keys(newConfig);
  for (var i = 0; i < targetKeys.length; i++) {
    var key = targetKeys[i];
    var value = String(newConfig[key]);

    if (existingKeys[key]) {
      // 기존 행 업데이트
      sheet.getRange(existingKeys[key], 2).setValue(value);
    } else {
      // 새로운 설정 키 행 추가
      var desc = CONFIG_DESCRIPTIONS[key] || '';
      sheet.appendRow([key, value, desc]);
    }
  }

  var updatedSettings = loadConfigFromSheet();
  return {
    status: 'success',
    message: '구글 시트에 환경설정이 성공적으로 저장되었습니다.',
    settings: updatedSettings
  };
}

function verifyAdminPasswordInSheet(inputPassword) {
  var config = loadConfigFromSheet();
  var correctPassword = config.adminPassword || DEFAULT_CONFIG.adminPassword;
  return String(inputPassword).trim() === String(correctPassword).trim();
}

function changeAdminPasswordInSheet(currentPassword, newPassword) {
  if (!verifyAdminPasswordInSheet(currentPassword)) {
    return { status: 'error', message: '현재 비밀번호가 일치하지 않습니다.' };
  }

  if (!newPassword || String(newPassword).trim().length < 4) {
    return { status: 'error', message: '새 비밀번호는 최소 4자 이상이어야 합니다.' };
  }

  var saveRes = saveConfigToSheet({ adminPassword: String(newPassword).trim() });
  if (saveRes.status === 'success') {
    return { status: 'success', message: '관리자 비밀번호가 시트에 안전하게 변경되었습니다.' };
  } else {
    return saveRes;
  }
}

// ==========================================
// 3. 도서 검색 프록시 (알라딘 Open API)
// ==========================================

function getAladinTtbKey() {
  var prop = PropertiesService.getScriptProperties().getProperty('ALADIN_TTB_KEY');
  return prop ? prop.trim() : '';
}

function searchBooks(query, maxResults) {
  if (!query || query.trim() === '') {
    return { status: 'error', message: '검색어를 입력해주세요.' };
  }

  var ttbKey = getAladinTtbKey();
  if (!ttbKey) {
    return {
      status: 'mock',
      message: '알라딘 TTB 키가 설정되지 않아 샘플 모드로 동작합니다. (Script Properties에 ALADIN_TTB_KEY를 등록하세요.)',
      items: [
        {
          title: '[예시] ' + query + '에 관한 책',
          author: '홍길동 (지은이)',
          publisher: '샘플출판사',
          priceStandard: 18000,
          priceSales: 16200,
          cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80',
          link: 'https://www.aladin.co.kr',
          isbn: '9788900000001',
          mallName: '알라딘'
        }
      ]
    };
  }

  var url = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?' +
    'ttbkey=' + encodeURIComponent(ttbKey) +
    '&Query=' + encodeURIComponent(query.trim()) +
    '&QueryType=Title' +
    '&MaxResults=' + (maxResults || 10) +
    '&start=1' +
    '&SearchTarget=Book' +
    '&output=js' +
    '&Version=20131101';

  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var text = response.getContentText();
  
  try {
    var json = JSON.parse(text);
    if (!json.item || json.item.length === 0) {
      return { status: 'success', items: [], message: '검색 결과가 없습니다.' };
    }

    var items = json.item.map(function(b) {
      return {
        title: cleanHtmlTags(b.title || ''),
        author: cleanHtmlTags(b.author || ''),
        publisher: cleanHtmlTags(b.publisher || ''),
        priceStandard: b.priceStandard || b.priceSales || 0,
        priceSales: b.priceSales || b.priceStandard || 0,
        cover: b.cover || '',
        link: b.link || '',
        isbn: b.isbn13 || b.isbn || '',
        mallName: '알라딘'
      };
    });

    return { status: 'success', items: items };
  } catch (e) {
    return { status: 'error', message: '알라딘 API 응답 파싱 실패: ' + e.toString(), raw: text.substring(0, 300) };
  }
}

// ==========================================
// 4. 서점 URL 파싱 및 도서정보 자동 추출
// ==========================================

function parseBookUrl(bookUrl) {
  if (!bookUrl || bookUrl.trim() === '') {
    return { status: 'error', message: 'URL을 입력해주세요.' };
  }

  var url = bookUrl.trim();
  var ttbKey = getAladinTtbKey();
  var mallName = '기타';
  var isbn = '';

  if (url.indexOf('aladin.co.kr') > -1) {
    mallName = '알라딘';
    var aladinMatch = url.match(/ItemId=(\d+)/i) || url.match(/\/wproduct\.aspx\?ItemId=(\d+)/i) || url.match(/ISBN13=(\d{10,13})/i);
    if (aladinMatch) {
      var idVal = aladinMatch[1];
      if (idVal.length === 10 || idVal.length === 13) {
        isbn = idVal;
      }
    }
  } else if (url.indexOf('kyobobook.co.kr') > -1) {
    mallName = '교보문고';
    var kyoboMatch = url.match(/barcode=(\d{10,13})/i) || url.match(/\/detail\/(S\d+|\d{10,13})/i);
    if (kyoboMatch) {
      if (/^\d{10,13}$/.test(kyoboMatch[1])) {
        isbn = kyoboMatch[1];
      }
    }
  } else if (url.indexOf('yes24.com') > -1) {
    mallName = 'YES24';
  }

  var pageTitle = '';
  var pageImage = '';
  var pageDescription = '';
  var extractedPrice = 0;

  try {
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    var html = response.getContentText();

    var ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
    if (ogTitleMatch) pageTitle = cleanHtmlTags(ogTitleMatch[1]);

    var ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
    if (ogImageMatch) pageImage = ogImageMatch[1];

    var ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i);
    if (ogDescMatch) pageDescription = cleanHtmlTags(ogDescMatch[1]);

    if (!isbn) {
      var isbnMatch = html.match(/97[89][-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,6}[-\s]?\d/);
      if (isbnMatch) {
        isbn = isbnMatch[0].replace(/[-\s]/g, '');
      }
    }
  } catch (err) {}

  if (isbn && ttbKey) {
    var lookupUrl = 'http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?' +
      'ttbkey=' + encodeURIComponent(ttbKey) +
      '&itemIdType=ISBN13' +
      '&ItemId=' + encodeURIComponent(isbn) +
      '&output=js' +
      '&Version=20131101';

    try {
      var res = UrlFetchApp.fetch(lookupUrl, { muteHttpExceptions: true });
      var lookupJson = JSON.parse(res.getContentText());
      if (lookupJson.item && lookupJson.item.length > 0) {
        var item = lookupJson.item[0];
        return {
          status: 'success',
          item: {
            title: cleanHtmlTags(item.title || pageTitle),
            author: cleanHtmlTags(item.author || ''),
            publisher: cleanHtmlTags(item.publisher || ''),
            price: item.priceStandard || item.priceSales || extractedPrice,
            mallName: mallName,
            link: url,
            cover: item.cover || pageImage,
            isbn: isbn
          }
        };
      }
    } catch (e) {}
  }

  var title = pageTitle || '';
  var author = '';
  var publisher = '';

  title = title.replace(/\s*[-|]\s*(교보문고|알라딘|YES24|예스24).*$/i, '').trim();

  if (pageDescription) {
    var parts = pageDescription.split(',');
    if (parts.length >= 2) {
      author = parts[0].trim();
      publisher = parts[1].trim();
    }
  }

  if (title || isbn) {
    return {
      status: 'success',
      item: {
        title: title || '제목 미확인 (직접 입력 필요)',
        author: author,
        publisher: publisher,
        price: extractedPrice,
        mallName: mallName,
        link: url,
        cover: pageImage,
        isbn: isbn
      }
    };
  }

  return {
    status: 'partial',
    message: '자동 추출 정보가 부족합니다. 직접 입력해주세요.',
    item: {
      title: '',
      author: '',
      publisher: '',
      price: 0,
      mallName: mallName,
      link: url,
      cover: '',
      isbn: ''
    }
  };
}

// ==========================================
// 5. 구글 시트 저장 (신청 접수)
// ==========================================

function saveBookRequest(data) {
  var sheet = getOrCreateRequestsSheet();

  var applicant = (data.applicant || '').trim();
  var title = (data.title || '').trim();
  var author = (data.author || '').trim();
  var publisher = (data.publisher || '').trim();
  var price = data.price ? Number(data.price) : 0;
  var mallName = (data.mallName || '').trim();
  var link = (data.link || '').trim();
  var notes = (data.notes || '').trim();
  var status = '신청접수';

  if (!applicant) {
    return { status: 'error', message: '신청자명을 입력해주세요.' };
  }
  if (!title) {
    return { status: 'error', message: '도서명을 입력해주세요.' };
  }

  var now = new Date();
  var timestamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // [신청일시, 신청자명, 도서명, 저자명, 출판사, 가격, 구매처, 구매링크, 상태, 비고]
  sheet.appendRow([
    timestamp,
    applicant,
    title,
    author,
    publisher,
    price,
    mallName,
    link,
    status,
    notes
  ]);

  return {
    status: 'success',
    message: '도서 신청이 성공적으로 접수되었습니다.',
    data: {
      timestamp: timestamp,
      applicant: applicant,
      title: title
    }
  };
}

// ==========================================
// 6. 시트 초기화 및 유틸리티
// ==========================================

function getOrCreateRequestsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('희망도서신청');
  if (!sheet) {
    sheet = ss.insertSheet('희망도서신청');
    initRequestsSheetHeaders(sheet);
  } else if (sheet.getLastRow() === 0) {
    initRequestsSheetHeaders(sheet);
  }
  return sheet;
}

function initRequestsSheetHeaders(sheet) {
  var headers = [
    '신청일시',
    '신청자명',
    '도서명',
    '저자명',
    '출판사',
    '가격',
    '구매처',
    '구매링크',
    '상태',
    '비고'
  ];

  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#2563EB');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 250);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 90);
  sheet.setColumnWidth(7, 100);
  sheet.setColumnWidth(8, 200);
  sheet.setColumnWidth(9, 100);
  sheet.setColumnWidth(10, 200);
}

function initAllSheets() {
  getOrCreateRequestsSheet();
  getOrCreateConfigSheet();
}

function cleanHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
