# Rich Editor Paste 이슈 및 해결 방안

## 🔍 현재 문제점

### 1. 보안 문제 (XSS)
- **문제**: 외부에서 복사한 HTML에 악성 스크립트(`<script>`, `onclick`, `onerror` 등)가 포함될 수 있음
- **위험도**: 높음
- **현재 상태**: paste 이벤트 핸들러가 없어 브라우저 기본 동작에 의존

### 2. 포맷 오염 문제
- **문제**: Word, Google Docs, 웹페이지 등에서 복사한 내용이 복잡한 HTML과 인라인 스타일을 포함
- **예시**:
  ```html
  <p style="color: red; font-size: 20px; font-family: Arial; margin: 10px;">
    <span style="background-color: yellow;">텍스트</span>
  </p>
  ```
- **위험도**: 중간
- **현재 상태**: 원치 않는 스타일이 그대로 붙여넣어짐

### 3. 불필요한 태그 및 속성
- **문제**: `<div>`, `<span>`, `<font>`, `class`, `id` 등 불필요한 태그/속성 포함
- **위험도**: 낮음
- **현재 상태**: 허용되지 않은 태그가 들어올 수 있음

### 4. 크로스 브라우저 차이
- **문제**: 브라우저마다 paste 동작이 다를 수 있음
  - Chrome: HTML을 그대로 붙여넣음
  - Firefox: 일부 스타일 제거
  - Safari: RTF 형식 지원
- **위험도**: 낮음

### 5. 서식 유지 문제
- **문제**: 사용자가 원하는 서식(볼드, 이탤릭, 링크 등)도 제거될 수 있음
- **위험도**: 낮음

## ✅ 해결 방안

### 1. Paste 이벤트 핸들러 추가
```typescript
const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
  e.preventDefault(); // 기본 동작 방지
  
  const clipboardData = e.clipboardData;
  const pastedHTML = clipboardData.getData('text/html');
  const pastedText = clipboardData.getData('text/plain');
  
  // HTML이 있으면 sanitize, 없으면 텍스트만 사용
  if (pastedHTML) {
    const sanitized = DOMPurify.sanitize(pastedHTML, {
      ALLOWED_TAGS: [...],
      ALLOWED_ATTR: [...],
    });
    // sanitized HTML 삽입
  } else {
    // plain text 삽입
  }
};
```

### 2. DOMPurify로 Sanitization
- 허용된 태그만 유지
- 위험한 속성 제거 (`onclick`, `style` 등)
- XSS 방지

### 3. 플레인 텍스트 붙여넣기 옵션
- `Shift + Ctrl/Cmd + V`: 서식 없이 텍스트만 붙여넣기
- 일반 `Ctrl/Cmd + V`: 서식 유지 (sanitize 후)

### 4. 인라인 스타일 제거 (선택사항)
- `style` 속성 제거하여 깔끔한 HTML 유지
- 또는 허용된 스타일만 유지

## 🎯 권장 구현

1. **기본 paste**: 서식 유지 + sanitization
2. **Shift+Ctrl+V**: 플레인 텍스트만
3. **DOMPurify 설정**: 허용된 태그/속성만
4. **에러 처리**: paste 실패 시 fallback

## 📝 참고사항

- `document.execCommand('paste')`는 deprecated
- Clipboard API 사용 권장
- 브라우저 호환성 고려 필요

