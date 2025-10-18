# 🌐 다국어(i18n) 지원 가이드

## 📌 개요

Open Mindmap은 **i18next**와 **react-i18next**를 사용하여 다국어를 지원합니다.

## 🗂️ 파일 구조

```
frontend/src/
├── i18n/
│   ├── index.ts              # i18n 초기화 설정
│   └── locales/
│       ├── en.json           # 영어 번역
│       └── ko.json           # 한국어 번역
└── components/
    └── LanguageSelector.tsx  # 언어 선택 컴포넌트
```

## 🚀 사용 방법

### 1. 컴포넌트에서 번역 사용

```tsx
import { useTranslation } from 'react-i18next';

export default function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('dashboard.createNew')}</button>
    </div>
  );
}
```

### 2. 언어 선택 컴포넌트 추가

```tsx
import LanguageSelector from '../components/LanguageSelector';

// 헤더나 툴바에 추가
<LanguageSelector />
```

### 3. 번역 키 추가

`frontend/src/i18n/locales/en.json`:
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a description"
  }
}
```

`frontend/src/i18n/locales/ko.json`:
```json
{
  "myFeature": {
    "title": "내 기능",
    "description": "이것은 설명입니다"
  }
}
```

## 🌍 지원 언어

| 언어 | 코드 | 플래그 |
|------|------|--------|
| English | `en` | 🇺🇸 |
| 한국어 | `ko` | 🇰🇷 |

## 📋 번역 키 구조

```
app.*                 # 앱 전체
login.*               # 로그인 페이지
dashboard.*           # 대시보드 페이지
editor.*              # 에디터 페이지
toolbar.*             # 툴바
canvas.*              # 캔버스
contextMenu.*         # 컨텍스트 메뉴
textAlign.*           # 텍스트 정렬
edgeType.*            # 엣지 타입
nodeShape.*           # 노드 형태
embedDialog.*         # 임베드 다이얼로그
jsonPreview.*         # JSON 미리보기
help.*                # 도움말
```

## 🔧 언어 변경

### 프로그래밍 방식

```tsx
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();

// 언어 변경
i18n.changeLanguage('ko');

// 현재 언어
const currentLang = i18n.language;
```

### 로컬 스토리지

언어 선택은 자동으로 `localStorage`에 저장되며, 다음 방문 시 자동 적용됩니다.

```
Key: i18nextLng
Value: en | ko
```

## 🎯 Best Practices

1. **일관된 키 네이밍**
   - 소문자와 점(`.`)으로 계층 구조 사용
   - 의미 있는 이름 사용

2. **번역 파일 동기화**
   - 새로운 키를 추가할 때 모든 언어 파일 업데이트
   - 누락된 번역은 영어로 fallback

3. **컴포넌트별 그룹화**
   - 관련된 번역은 같은 네임스페이스로 그룹화
   - 재사용 가능한 공통 텍스트는 `common.*`에 추가

## 🐛 문제 해결

### 번역이 표시되지 않을 때

1. `main.tsx`에서 i18n이 초기화되었는지 확인:
```tsx
import './i18n';
```

2. 번역 키가 올바른지 확인:
```tsx
// ✅ Good
{t('dashboard.title')}

// ❌ Bad
{t('dashboard.titles')}  // 오타
```

3. 브라우저 콘솔에서 오류 확인

### 새로운 언어 추가

1. 새로운 번역 파일 생성:
```bash
touch frontend/src/i18n/locales/ja.json
```

2. `i18n/index.ts`에 추가:
```tsx
import ja from './locales/ja.json';

i18n.init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    ja: { translation: ja }, // 추가
  },
});
```

3. `LanguageSelector.tsx`에 옵션 추가:
```tsx
const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' }, // 추가
];
```

## 📚 참고 자료

- [i18next 공식 문서](https://www.i18next.com/)
- [react-i18next 공식 문서](https://react.i18next.com/)
- [i18next-browser-languagedetector](https://github.com/i18next/i18next-browser-languageDetector)

