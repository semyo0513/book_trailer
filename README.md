# 📚 희망도서 신청 웹 애플리케이션

Google Sheets & Google Apps Script(GAS)를 백엔드로 활용하고, GitHub Pages로 호스팅 가능한 반응형 희망도서 신청 웹앱입니다.

---

## ✨ 주요 기능

1. **3-Way 도서 입력 UX**:
   - 🔍 **도서 실시간 검색**: 알라딘 Open API 기반으로 도서명/저자명 검색 후 원클릭 자동 입력
   - 🔗 **서점 URL 자동입력**: 알라딘, 교보문고, YES24 상품 링크를 붙여넣으면 도서 정보(제목, 저자, 출판사, 가격 등) 자동 추출
   - ✍️ **직접 입력(수동)**: 모든 항목 직접 입력 가능
2. **구글 스프레드시트 자동 DB 연동**:
   - 신청 데이터가 구글 시트에 실시간으로 기록 (`appendRow`)
   - 신청일시 타임스탬프, 처리 상태(`신청접수`), 신청 사유 등 관리자용 필드 제공
3. **모던 & 반응형 인터페이스**:
   - 모바일, 태블릿, 데스크톱 완벽 지원 (Tailwind CSS)
   - 로딩 스켈레톤, 토스트 알림, 모달 다이얼로그
4. **안전한 API 키 관리**:
   - 알라딘 TTB 키는 GAS `PropertiesService` 서버단에 보관되어 프론트엔드에 노출되지 않음

---

## 📁 파일 구조

```text
├── index.html              # 메인 애플리케이션 UI
├── css/
│   └── style.css           # 애니메이션 및 커스텀 스타일
├── js/
│   ├── config.js           # 환경 설정 (GAS Web App URL)
│   ├── api.js              # GAS API 통신 클라이언트 및 Mock 지원
│   └── app.js              # 폼 제어, 검색, 파싱 및 상태 관리
├── gas/
│   └── Code.gs             # Google Apps Script 백엔드 코드
├── GAS_SETUP_GUIDE.md      # 구글 시트 생성 및 GAS 배포 상세 가이드
├── plan.md                 # 기획서
└── README.md               # 프로젝트 매뉴얼
```

---

## 🌐 GitHub Pages 배포 방법

1. 본 레포지토리를 GitHub에 Push합니다.
2. 레포지토리의 **Settings &rarr; Pages** 메뉴로 이동합니다.
3. **Build and deployment &rarr; Branch**를 `main` (또는 `master`) / `/(root)`로 설정하고 **Save**를 클릭합니다.
4. 잠시 후 제공되는 GitHub Pages URL로 전세계 어디서나 웹앱에 접속할 수 있습니다.
