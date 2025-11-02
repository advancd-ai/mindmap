# 📝 Rich Editor Node 기획서

## 🎯 목표

노드의 텍스트(label)를 **WYSIWYG (What You See Is What You Get) 리치 에디터** 형식으로 지원하여, 마크다운과 다른 방식으로 더 직관적이고 시각적인 편집 경험을 제공한다.

## 📊 현재 상태

### 현재 구현 ✅
- **노드 텍스트**: `Node.label` (마크다운 문자열 또는 HTML)
- **노드 타입**: `Node.contentType` 필드로 'markdown' 또는 'richeditor' 선택 가능
- **마크다운 노드**: `NodeEditor` + `MarkdownRenderer` 사용 (기존)
- **리치 에디터 노드**: `RichEditor` + `RichEditorRenderer` 사용 (신규 구현 완료)
- **구현 완료 항목**:
  - ✅ WYSIWYG 에디터 (contentEditable 기반)
  - ✅ 서식 도구 툴바
  - ✅ 안전한 붙여넣기 (DOMPurify sanitization)
  - ✅ 키보드 단축키 지원
  - ✅ 텍스트 정렬
  - ✅ 노드 타입 선택 UI

## 🎨 요구사항

### 1. 기능 요구사항

#### 기본 리치 에디터 지원
- [x] **서식 도구** ✅:
  - [x] **Bold** (굵게)
  - [x] *Italic* (기울임)
  - [x] ~~Strikethrough~~ (취소선)
  - [x] <u>Underline</u> (밑줄)
  - [x] `Code` (인라인 코드)
  - [ ] 서식 제거 (Clear Format) - 향후 추가
- [ ] **텍스트 스타일** (향후 추가):
  - [ ] 글꼴 크기 조절
  - [ ] 글꼴 색상 변경
  - [ ] 배경색 지정
  - [ ] 하이라이트
- [x] **제목 및 문단** ✅:
  - [x] 제목 (H1, H2, H3)
  - [x] 문단 (Paragraph - 기본)
  - [x] 인용문 (Blockquote)
  - [x] 코드 블록 (Code Block)
  - [x] 구분선 (Horizontal Rule)
- [x] **리스트** ✅:
  - [x] 순서 없는 리스트 (Bullet List)
  - [x] 순서 있는 리스트 (Numbered List)
  - [ ] 체크리스트 (Checkbox List) - 향후 추가
  - [ ] 리스트 들여쓰기/내어쓰기 - 향후 추가
- [x] **링크 및 미디어** ✅:
  - [x] 링크 삽입/편집
  - [ ] 이미지 삽입 (옵션) - 향후 추가
  - [ ] 링크 제거 - 향후 추가
- [x] **텍스트 정렬** ✅:
  - [x] 왼쪽 정렬
  - [x] 가운데 정렬
  - [x] 오른쪽 정렬
  - [ ] 양쪽 정렬 (Justify) - 향후 추가

#### 편집 기능
- [x] **WYSIWYG 에디터**: 드래그 앤 드롭으로 서식 적용 ✅
- [x] **인라인 편집 모드**: 노드 더블클릭 시 리치 에디터 모드 ✅
- [x] **Multi-line 지원**: 여러 줄 텍스트 입력 및 편집 ✅
- [x] **실시간 렌더링**: 입력 즉시 시각적 결과 표시 ✅
- [x] **클립보드 지원**: 다른 애플리케이션에서 복사/붙여넣기 (서식 유지 + sanitize) ✅
- [x] **플레인 텍스트 붙여넣기**: Shift+Ctrl+V로 서식 없이 붙여넣기 ✅
- [x] **Undo/Redo**: 브라우저 기본 동작으로 실행 취소/다시 실행 ✅
- [x] **선택 영역 편집**: 텍스트 선택 후 서식 적용 ✅

#### 렌더링
- [x] **HTML 렌더링**: 리치 에디터 콘텐츠를 HTML로 렌더링 ✅
- [x] **SVG 호환**: SVG 내에서 HTML 렌더링 (foreignObject 사용) ✅
- [x] **반응형 텍스트**: 노드 크기에 맞춰 텍스트 자동 조절 ✅
- [x] **스크롤**: 긴 콘텐츠는 노드 내 스크롤 ✅
- [x] **안전한 렌더링**: DOMPurify로 XSS 방지 ✅

### 2. 기술 요구사항

#### 데이터 구조
```typescript
interface Node {
  id: string;
  label: string;                    // HTML 콘텐츠 또는 마크다운 (기존 호환성)
  contentType?: 'markdown' | 'richeditor';  // 콘텐츠 타입 (기본: 'markdown')
  // ... 기존 필드
}
```

#### 마이그레이션 전략
- 기존 `label` 값은 자동으로 마크다운으로 처리 (호환성 유지)
- 사용자가 리치 에디터를 선택하면 `contentType: 'richeditor'`로 설정
- 리치 에디터 콘텐츠는 HTML 형식으로 저장
- 마크다운 노드와 리치 에디터 노드 간 변환 가능 (선택사항)

### 3. UI/UX 요구사항

#### 편집 경험
- **인라인 편집**: 노드 더블클릭 시 리치 에디터 모드 ✅
- **에디터 타입**: WYSIWYG 에디터 (contentEditable 기반) ✅
- **툴바**: 편집 모드 시 서식 도구 툴바 표시 ✅
- **키보드 단축키** ✅:
  - `Ctrl/Cmd + B`: Bold 토글 ✅
  - `Ctrl/Cmd + I`: Italic 토글 ✅
  - `Ctrl/Cmd + U`: Underline 토글 ✅
  - `Ctrl/Cmd + K`: 링크 삽입/편집 ✅
  - `Ctrl/Cmd + V`: 붙여넣기 (서식 유지, sanitize) ✅
  - `Shift + Ctrl/Cmd + V`: 플레인 텍스트 붙여넣기 ✅
  - `Alt/Option + Enter`: 저장 후 종료 ✅
  - `Ctrl/Cmd + Enter`: 저장 (하위 호환성) ✅
  - `Escape`: 취소 ✅
  - `Ctrl/Cmd + Z`: Undo (브라우저 기본 동작)
  - `Ctrl/Cmd + Shift + Z`: Redo (브라우저 기본 동작)

#### 렌더링 경험
- **자동 크기 조절**: 리치 콘텐츠에 맞춰 노드 높이 자동 조절 (최대 높이 제한)
- **스크롤 표시**: 콘텐츠가 넘칠 경우 스크롤바 표시
- **서식 표시**: Bold, Italic, Underline, 색상 등 모든 서식이 렌더링 시 표시
- **링크 클릭**: Ctrl/Cmd + 클릭으로 새 탭에서 열기
- **이미지 표시**: 이미지가 있을 경우 노드 크기 내에서 표시 (옵션)

## 🏗️ 설계

### 1. 아키텍처

```
┌─────────────────────────────────────┐
│         MindMapCanvas               │
│  ┌───────────────────────────────┐ │
│  │         Node Component         │ │
│  │  ┌─────────────────────────┐  │ │
│  │  │  RichEditorRenderer      │  │ │
│  │  │  - parse HTML           │  │ │
│  │  │  - render React elements │  │ │
│  │  │  - sanitize HTML        │  │ │
│  │  └─────────────────────────┘  │ │
│  │         ↓ (더블클릭)          │ │
│  │  ┌─────────────────────────┐  │ │
│  │  │  RichEditor             │  │ │
│  │  │  ┌─────────────────────┐ │  │ │
│  │  │  │ RichEditorToolbar   │ │  │ │
│  │  │  │ - Bold/Italic/Color │ │  │ │
│  │  │  │ - Heading/List/Link │ │  │ │
│  │  │  └─────────────────────┘ │  │ │
│  │  │  ┌─────────────────────┐ │  │ │
│  │  │  │ contentEditable     │ │  │ │
│  │  │  │ - WYSIWYG           │ │  │ │
│  │  │  │ - inline editing    │ │  │ │
│  │  │  │ - auto-resize       │ │  │ │
│  │  │  └─────────────────────┘ │  │ │
│  │  └─────────────────────────┘  │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. 컴포넌트 구조

#### 새 컴포넌트
- [ ] **`RichEditorRenderer`**: HTML 콘텐츠를 React 컴포넌트로 렌더링
  - HTML 파싱 및 sanitization
  - SVG 내에서 안전한 렌더링
- [ ] **`RichEditor`**: WYSIWYG 편집 컴포넌트
  - contentEditable 기반 또는 전용 라이브러리 사용
  - 실시간 서식 적용
- [ ] **`RichEditorToolbar`**: 리치 에디터 서식 도구 툴바
  - 위치: 에디터 상단
  - 기능: 서식 버튼, 색상 선택기, 링크 입력 등

#### 기존 컴포넌트 수정
- [ ] **`Node.tsx`**: `contentType`에 따라 `MarkdownRenderer` 또는 `RichEditorRenderer` 사용
- [ ] **`NodeEditor.tsx`**: `contentType`에 따라 마크다운 에디터 또는 리치 에디터 표시
- [ ] **`MindMapCanvas.tsx`**: 노드 타입 선택 기능 추가 (마크다운/리치 에디터)

### 3. 기술 스택

#### WYSIWYG 에디터 옵션
- **Option 1**: `contentEditable` 직접 구현
  - 장점: 경량, 완전한 제어
  - 단점: 크로스 브라우저 호환성 처리 필요, 복잡도 높음
- **Option 2**: `draft-js` (Facebook)
  - 장점: React 친화적, 강력한 기능
  - 단점: 학습 곡선, 번들 크기
- **Option 3**: `slate` (최신)
  - 장점: 모던 아키텍처, 플러그인 시스템
  - 단점: 상대적으로 새로운 라이브러리
- **Option 4**: `quill` (Quill.js)
  - 장점: 널리 사용됨, 안정적
  - 단점: React 통합 필요, 커스터마이징 어려움
- **권장**: **`slate`** 또는 **`contentEditable` 직접 구현**

#### HTML Sanitization
- **권장**: `DOMPurify` 사용
- **기능**: XSS 방지, 안전한 HTML 렌더링
- **통합**: `rehype-sanitize`와 유사한 방식

### 4. 데이터 저장

#### 스키마 변경
```typescript
interface Node {
  id: string;
  label: string;                    // 마크다운 또는 HTML (contentType에 따라)
  contentType?: 'markdown' | 'richeditor';  // 콘텐츠 타입
  // ... 기존 필드
}
```

#### 저장 형식
- **마크다운 노드**: `label`에 마크다운 문자열 저장
- **리치 에디터 노드**: `label`에 HTML 문자열 저장
- **호환성**: 기존 마크다운 노드는 그대로 유지

#### 마이그레이션 전략
1. **Phase 1**: 리치 에디터 지원 추가 (기존 데이터 유지)
2. **Phase 2**: 노드별로 콘텐츠 타입 선택 가능
3. **Phase 3**: 마크다운 ↔ 리치 에디터 변환 도구 (선택사항)

## 🚀 구현 단계

### Phase 1: 기본 리치 에디터 렌더링 (MVP) ✅ (완료)
- [x] `contentEditable` 기반 에디터 구현 (선택 완료)
- [x] `RichEditorRenderer` 컴포넌트 구현
- [x] HTML sanitization 통합 (`DOMPurify`)
- [x] `Node` 컴포넌트에서 `contentType`에 따라 렌더러 선택
- [x] 기본 HTML 렌더링 테스트

**완료일**: 2025-01-31

### Phase 2: 기본 WYSIWYG 편집 기능 ✅ (완료)
- [x] `RichEditor` 컴포넌트 구현
- [x] 기본 텍스트 편집 기능 (입력, 삭제, 선택)
- [x] 저장/취소 기능
- [x] 자동 높이 조절
- [x] 기본 키보드 단축키 (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K)

**완료일**: 2025-01-31

### Phase 3: 서식 도구 툴바 ✅ (완료)
- [x] **리치 에디터 툴바 구현**
  - [x] 툴바 UI 컴포넌트 (`RichEditorToolbar.tsx`)
  - [x] 툴바 위치: 에디터 상단
  - [x] 툴바 버튼:
    - [x] **Bold** (Ctrl+B)
    - [x] *Italic* (Ctrl+I)
    - [x] ~~Strikethrough~~
    - [x] <u>Underline</u> (Ctrl+U)
    - [x] `Code`
    - [x] 링크 삽입 (Ctrl+K)
    - [x] 제목 (H1, H2, H3)
    - [x] 리스트 (Bullet, Numbered)
    - [x] 인용 (`>`)
    - [x] 구분선 (`---`)
    - [x] 코드 블록
    - [x] 텍스트 정렬 (Left, Center, Right)
    - [ ] 색상 선택 (텍스트 색상, 배경색) - 향후 추가
    - [ ] 서식 제거 - 향후 추가

**완료일**: 2025-01-31

### Phase 3.5: Copy/Paste 보안 및 포맷 처리 ✅ (완료)
- [x] Paste 이벤트 핸들러 추가
- [x] DOMPurify로 안전한 HTML sanitization
- [x] 인라인 스타일 제거 (style, class, id)
- [x] 플레인 텍스트 붙여넣기 지원 (Shift+Ctrl+V)
- [x] 링크 보안 속성 자동 추가
- [x] XSS 방지

**완료일**: 2025-01-31

**참고**: Paste 이슈 및 해결 방안은 `docs/richeditor-paste-issues.md` 참조

### Phase 4: 고급 기능
- [ ] **Undo/Redo 지원**
  - [ ] 실행 취소 (Ctrl+Z) - 브라우저 기본 동작 활용 가능
  - [ ] 다시 실행 (Ctrl+Shift+Z) - 브라우저 기본 동작 활용 가능
  - [ ] 커스텀 히스토리 관리 (선택사항)
- [x] **클립보드 지원** ✅
  - [x] 외부에서 복사/붙여넣기 (서식 유지, sanitize)
  - [x] 내부 복사/붙여넣기
  - [x] 플레인 텍스트 붙여넣기 옵션 (Shift+Ctrl+V)
- [ ] **이미지 삽입** (옵션)
  - [ ] 이미지 URL 입력
  - [ ] 이미지 업로드 (선택사항)
  - [ ] 이미지 크기 조절

**예상 기간**: 2-3일 (클립보드 지원 완료로 단축)

### Phase 5: 최적화 및 통합
- [x] 노드 타입 선택 UI (마크다운/리치 에디터) ✅
  - [x] 컨텍스트 메뉴에서 Content Type 변경 기능
- [ ] 마크다운 노드와 리치 에디터 노드 간 변환 도구
- [ ] 성능 최적화 (긴 HTML 콘텐츠 처리)
- [ ] 크로스 브라우저 호환성 테스트

**예상 기간**: 1-2일 (노드 타입 선택 UI 완료로 단축)

**총 완료 기간**: 1일 (Phase 1-3, 3.5, 5 일부)
**남은 작업**: Phase 4 고급 기능, Phase 5 일부

## 🔍 기술적 고려사항

### 1. SVG 렌더링
- SVG `<text>` 요소는 HTML을 직접 렌더링할 수 없음
- **해결책**: `foreignObject` 사용하여 HTML 렌더링
- **주의사항**: 브라우저 호환성 (모던 브라우저 지원)
- **제한사항**: 일부 복잡한 CSS 스타일이 SVG 내에서 제대로 렌더링되지 않을 수 있음

### 2. 성능
- **긴 HTML 콘텐츠**: 가상화(virtualization) 고려
- **파싱 최적화**: HTML 파싱 결과 캐싱
- **렌더링 최적화**: 변경된 노드만 리렌더링
- **에디터 초기화**: contentEditable 초기화 비용 고려

### 3. 보안
- **XSS 방지**: HTML 렌더링 시 반드시 sanitization 필수
- **DOMPurify** 사용 권장
- **링크 보안**: `rel="noopener noreferrer"` 자동 추가
- **이미지 보안**: 외부 이미지 로딩 제한 또는 CORS 처리

### 4. 접근성
- **스크린 리더**: HTML 구조를 의미론적으로 전달
- **키보드 네비게이션**: 에디터 내 키보드 접근성 유지
- **ARIA 라벨**: 적절한 ARIA 속성 추가
- **포커스 관리**: 편집 모드 진입/종료 시 포커스 처리

### 5. 크로스 브라우저 호환성
- **contentEditable 차이**: 브라우저마다 contentEditable 동작이 다름
- **선택 영역 처리**: Selection API 크로스 브라우저 처리 필요
- **실행 취소/다시 실행**: 브라우저 기본 동작 활용 또는 커스텀 구현

## 📋 체크리스트

### 개발 전
- [ ] 기획 검토 및 승인
- [ ] 디자인 스펙 확정
- [ ] 기술 스택 최종 결정 (slate vs contentEditable vs 기타)
- [ ] 성능 요구사항 정의
- [ ] 보안 요구사항 정의

### 개발 중
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 접근성 검증
- [ ] 보안 검증 (XSS 테스트)
- [ ] 크로스 브라우저 테스트

### 배포 전
- [ ] 사용자 테스트
- [ ] 성능 벤치마크
- [ ] 문서화 (사용자 가이드)
- [ ] 마이그레이션 스크립트 준비 (필요시)

## 🎓 사용자 가이드 (초안)

### 리치 에디터 기본 사용법

노드를 더블클릭하여 리치 에디터 모드로 진입하면, 텍스트를 시각적으로 편집할 수 있습니다.

#### 서식 적용
- 텍스트를 **선택**한 후 툴바 버튼 클릭
- 또는 키보드 단축키 사용 (Ctrl+B, Ctrl+I 등)
- 서식이 즉시 적용되어 표시됨

#### 기본 기능
- **볼드**: 텍스트 선택 후 `Ctrl+B` 또는 툴바의 **B** 버튼
- *기울임*: 텍스트 선택 후 `Ctrl+I` 또는 툴바의 *I* 버튼
- ~~취소선~~: 텍스트 선택 후 툴바의 ~~S~~ 버튼
- <u>밑줄</u>: 텍스트 선택 후 `Ctrl+U` 또는 툴바의 <u>U</u> 버튼
- `코드`: 텍스트 선택 후 툴바의 코드 버튼
- **링크**: 텍스트 선택 후 `Ctrl+K` 또는 툴바의 🔗 버튼

#### 제목 및 리스트
- 제목: 텍스트 선택 후 H1, H2, H3 버튼 클릭
- 리스트: 줄의 시작에서 • 또는 1. 버튼 클릭

#### 키보드 단축키
- `Ctrl/Cmd + B`: Bold 토글
- `Ctrl/Cmd + I`: Italic 토글
- `Ctrl/Cmd + U`: Underline 토글
- `Ctrl/Cmd + K`: 링크 삽입/편집
- `Ctrl/Cmd + Z`: 실행 취소
- `Ctrl/Cmd + Shift + Z`: 다시 실행
- `Alt/Option + Enter`: 저장 후 종료
- `Escape`: 취소

### 마크다운 vs 리치 에디터

#### 마크다운 노드
- **장점**: 간결함, 버전 관리 친화적, 코드처럼 편집
- **적합한 경우**: 개발 문서, 기술 문서, 간단한 메모

#### 리치 에디터 노드
- **장점**: 직관적 편집, WYSIWYG, 시각적 서식 적용
- **적합한 경우**: 복잡한 서식 필요, 비개발자 사용자, 프레젠테이션

## 🔗 참고 자료

- [Slate.js Documentation](https://www.slatejs.org/)
- [Draft.js Documentation](https://draftjs.org/)
- [Quill.js Documentation](https://quilljs.com/)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [contentEditable Guide](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)

## 📝 추가 고려사항

### 향후 확장 가능성
1. **하이브리드 모드**: 마크다운 입력 시 자동으로 리치 에디터로 변환
2. **템플릿 시스템**: 미리 정의된 서식 템플릿 적용
3. **협업 기능**: 실시간 공동 편집 (선택사항)
4. **내보내기**: 리치 에디터 콘텐츠를 PDF, DOCX 등으로 내보내기
5. **플러그인 시스템**: 커스텀 서식 및 기능 추가

### 마이그레이션 계획
- 기존 마크다운 노드는 그대로 유지
- 새 노드는 사용자가 마크다운 또는 리치 에디터 선택 가능
- 마크다운 → 리치 에디터 변환 도구 제공 (선택사항)
- 리치 에디터 → 마크다운 변환 도구 제공 (선택사항)

---

## 📊 구현 현황

### ✅ 완료된 항목
- **Phase 1**: 기본 리치 에디터 렌더링 (100%)
  - RichEditorRenderer 컴포넌트 구현
  - DOMPurify 통합
  - Node 컴포넌트에 통합
- **Phase 2**: 기본 WYSIWYG 편집 기능 (100%)
  - RichEditor 컴포넌트 구현 (contentEditable 기반)
  - 자동 높이 조절
  - 저장/취소 기능
  - 기본 키보드 단축키
- **Phase 3**: 서식 도구 툴바 (100%)
  - RichEditorToolbar 컴포넌트 구현
  - 모든 기본 서식 버튼 (Bold, Italic, Underline, Strikethrough, Code, Link, Heading, List, Blockquote, Code Block, Horizontal Rule)
  - 텍스트 정렬 도구 (Left, Center, Right)
- **Phase 3.5**: Copy/Paste 보안 및 포맷 처리 (100%)
  - Paste 이벤트 핸들러
  - DOMPurify sanitization
  - 인라인 스타일 제거
  - 플레인 텍스트 붙여넣기 (Shift+Ctrl+V)
  - XSS 방지
- **Phase 5 일부**: 노드 타입 선택 UI (100%)
  - 컨텍스트 메뉴에서 Content Type 변경 기능
  - MindMapCanvas에서 contentType에 따라 에디터 자동 선택

### 📅 예정
- **Phase 4**: 고급 기능 (이미지 삽입, 커스텀 Undo/Redo)
- **Phase 5**: 최적화 및 통합 (마크다운 ↔ 리치 에디터 변환, 성능 최적화)

### 🎯 현재 사용 가능한 기능
1. **리치 에디터 노드 생성 및 편집**
   - 노드 우클릭 → Content Type → Rich Editor 선택
   - 더블클릭으로 WYSIWYG 편집 모드 진입
2. **서식 도구**
   - 툴바 버튼 또는 키보드 단축키로 서식 적용
3. **안전한 붙여넣기**
   - 일반 붙여넣기: 서식 유지 + sanitize
   - 플레인 텍스트: Shift+Ctrl+V
4. **텍스트 정렬**
   - 왼쪽, 가운데, 오른쪽 정렬 지원

---

**작성일**: 2025-01-31
**최종 업데이트**: 2025-01-31
**작성자**: Development Team
**상태**: Phase 1-3, 3.5, 5 일부 완료 / Phase 4, 5 일부 예정

