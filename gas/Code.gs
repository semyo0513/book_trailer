/**
 * 희망도서 신청 웹앱 - Google Apps Script (Code.gs)
 * 
 * 기능:
 * 1. 도서 검색 프록시 (알라딘 Open API)
 * 2. 서점 URL 도서정보 파싱 (알라딘 / 교보문고 / YES24 등)
 * 3. 희망도서 신청 저장 (Google Sheets appendRow)
 * 4. 시트 헤더 자동 초기화
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
      initSheetHeaders();
      return createJsonResponse({ status: 'success', message: '시트 헤더가 초기화되었습니다.' });
    } else {
      return createJsonResponse({ status: 'error', message: '알 수 없는 action입니다: ' + action });
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
// 2. 도서 검색 프록시 (알라딘 Open API)
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
// 3. 서점 URL 파싱 및 도서정보 자동 추출
// ==========================================

function parseBookUrl(bookUrl) {
  if (!bookUrl || bookUrl.trim() === '') {
    return { status: 'error', message: 'URL을 입력해주세요.' };
  }

  var url = bookUrl.trim();
  var ttbKey = getAladinTtbKey();
  var mallName = '기타';
  var isbn = '';

  // 1) 서점 도메인 식별
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

  // 2) 웹페이지 직접 요청하여 메타태그(og:title, og:image) 또는 ISBN 추출
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

    // 메타 태그 추출
    var ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i);
    if (ogTitleMatch) pageTitle = cleanHtmlTags(ogTitleMatch[1]);

    var ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
    if (ogImageMatch) pageImage = ogImageMatch[1];

    var ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i);
    if (ogDescMatch) pageDescription = cleanHtmlTags(ogDescMatch[1]);

    // HTML 내부에서 ISBN13 탐색
    if (!isbn) {
      var isbnMatch = html.match(/97[89][-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,6}[-\s]?\d/);
      if (isbnMatch) {
        isbn = isbnMatch[0].replace(/[-\s]/g, '');
      }
    }
  } catch (err) {}

  // 3) ISBN이 있고 TTB 키가 있으면 알라딘 ItemLookUp으로 완벽한 도서정보 조회
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

  // 4) 알라딘 API 조회가 안되더라도 파싱된 메타정보 반환
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
// 4. 구글 시트 저장 (신청 접수)
// ==========================================

function saveBookRequest(data) {
  var sheet = getOrCreateSheet();

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
// 5. 유틸리티 함수
// ==========================================

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('희망도서신청') || ss.getActiveSheet();
  if (sheet.getLastRow() === 0) {
    initSheetHeaders(sheet);
  }
  return sheet;
}

function initSheetHeaders(targetSheet) {
  var sheet = targetSheet || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#3B82F6');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // 컬럼 너비 기본 조정
    sheet.setColumnWidth(1, 150); // 신청일시
    sheet.setColumnWidth(2, 100); // 신청자명
    sheet.setColumnWidth(3, 250); // 도서명
    sheet.setColumnWidth(4, 150); // 저자명
    sheet.setColumnWidth(5, 130); // 출판사
    sheet.setColumnWidth(6, 90);  // 가격
    sheet.setColumnWidth(7, 100); // 구매처
    sheet.setColumnWidth(8, 200); // 구매링크
    sheet.setColumnWidth(9, 100); // 상태
    sheet.setColumnWidth(10, 200);// 비고
  }
}

function cleanHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
