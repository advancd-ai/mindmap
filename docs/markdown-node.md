# 📝 Markdown Node 기획서

## 🎯 목표

노드의 텍스트(label)를 기본적으로 **마크다운 형식**으로 지원하여, 더 풍부하고 구조화된 콘텐츠를 노드 내에 표현할 수 있도록 한다.

## 📊 현재 상태

### 현재 구현
- **노드 텍스트**: `Node.label` (단순 문자열)
- **노드 에디터**: `NodeEditor` 컴포넌트에서 단순 `<input type="text">` 사용
- **렌더링**: SVG `<text>` 요소 또는 HTML `<div>`로 단순 텍스트 렌더링
- **제한사항**:
  - 일반 텍스트만 지원
  - 줄바꿈 제한적
  - 서식(볼드, 이탤릭, 리스트 등) 불가
  - 링크, 이미지 삽입 불가

## 🎨 요구사항

### 1. 기능 요구사항

#### 기본 마크다운 지원
- [x] **제목**: `# H1`, `## H2`, `### H3`
- [x] **강조**: `**bold**`, `*italic*`, `~~strikethrough~~`
- [x] **리스트**: 
  - `- 항목` (순서 없는 리스트)
  - `1. 항목` (순서 있는 리스트)
- [x] **링크**: `[텍스트](URL)`
- [ ] **이미지**: `![alt](URL)` (옵션, 노드 크기 내에서)
- [x] **코드**: `` `inline code` ``, ` ```code block``` `
- [x] **인용**: `> 인용문`
- [x] **구분선**: `---`
- [x] **줄바꿈**: 단일 줄바꿈 또는 `  ` (2 spaces)

#### 편집 기능
- [x] **인라인 편집 모드**: 노드 더블클릭 시 마크다운 편집 모드 (textarea 기반)
- [x] **Multi-line 지원**: 여러 줄 텍스트 입력 가능
- [ ] **프리뷰 모드**: 편집 중 실시간 프리뷰 (Split view 또는 토글)
- [ ] **마크다운 툴바**: 자주 사용하는 마크다운 문법 버튼
- [ ] **자동 완성**: 링크, 이미지 URL 자동 완성
- [ ] **Syntax highlighting**: 편집 중 마크다운 문법 하이라이팅

#### 렌더링
- [x] **마크다운 파싱**: 마크다운 문법을 HTML/React 컴포넌트로 변환
- [x] **SVG 호환**: SVG 내에서 마크다운 렌더링 (foreignObject 사용)
- [x] **반응형 텍스트**: 노드 크기에 맞춰 텍스트 자동 조절
- [x] **스크롤**: 긴 콘텐츠는 노드 내 스크롤

### 2. 기술 요구사항

#### 데이터 구조
```typescript
interface Node {
  id: string;
  label: string;           // 마크다운 텍스트 (기존 유지)
  labelFormat?: 'markdown' | 'plain';  // 포맷 타입 (기본: 'markdown')
  // ... 기존 필드
}
```

#### 마이그레이션
- 기존 `label` 값은 자동으로 마크다운으로 처리 (호환성 유지)
- 사용자가 plain text를 원할 경우 `labelFormat: 'plain'` 설정 가능

### 3. UI/UX 요구사항

#### 편집 경험
- **인라인 편집**: 노드 더블클릭 시 편집 모드
- **에디터 타입**: 
  - 기본: 마크다운 에디터 (textarea + syntax highlighting)
  - 옵션: WYSIWYG 에디터 (선택 가능)
- **현재 구현된 키보드 단축키**:
  - `Enter`: 새 줄 추가
  - `Ctrl/Cmd + Enter`: 저장
  - `Escape`: 취소
  - `Tab`: 2칸 들여쓰기 (마크다운 컨벤션)
- **추가 예정 키보드 단축키**:
  - `Ctrl+B` / `Cmd+B`: Bold 토글
  - `Ctrl+I` / `Cmd+I`: Italic 토글
  - `Ctrl+K` / `Cmd+K`: 링크 삽입/편집
  - `Ctrl+` / `Cmd+`: 코드 블록 삽입
  - `Shift+Tab`: 리스트 내어쓰기
  - `Ctrl+]` / `Cmd+]`: 인용 블록 삽입

#### 렌더링 경험
- **자동 크기 조절**: 마크다운 콘텐츠에 맞춰 노드 높이 자동 조절 (최대 높이 제한)
- **스크롤 표시**: 콘텐츠가 넘칠 경우 스크롤바 표시
- **링크 클릭**: Ctrl/Cmd + 클릭으로 새 탭에서 열기 (기본 동작 유지)

## 🏗️ 설계

### 1. 아키텍처

```
┌─────────────────────────────────────┐
│         MindMapCanvas               │
│  ┌───────────────────────────────┐ │
│  │         Node Component         │ │
│  │  ┌─────────────────────────┐  │ │
│  │  │  MarkdownRenderer        │  │ │
│  │  │  - parse markdown       │  │ │
│  │  │  - render React elements │  │ │
│  │  └─────────────────────────┘  │ │
│  │         ↓ (더블클릭)          │ │
│  │  ┌─────────────────────────┐  │ │
│  │  │  NodeEditor              │  │ │
│  │  │  ┌─────────────────────┐ │  │ │
│  │  │  │ MarkdownToolbar     │ │  │ │
│  │  │  │ - Bold/Italic/Code  │ │  │ │
│  │  │  │ - Link/Heading/List │ │  │ │
│  │  │  └─────────────────────┘ │  │ │
│  │  │  ┌─────────────────────┐ │  │ │
│  │  │  │ textarea            │ │  │ │
│  │  │  │ - multi-line         │ │  │ │
│  │  │  │ - syntax highlight?  │ │  │ │
│  │  │  │ - auto-resize        │ │  │ │
│  │  │  └─────────────────────┘ │  │ │
│  │  │  ┌─────────────────────┐ │  │ │
│  │  │  │ Preview Toggle      │ │  │ │
│  │  │  │ (Split/Full view)   │ │  │ │
│  │  │  └─────────────────────┘ │  │ │
│  │  └─────────────────────────┘  │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 2. 컴포넌트 구조

#### 새 컴포넌트
- [x] **`MarkdownRenderer`**: 마크다운 텍스트를 React 컴포넌트로 렌더링 ✅
- [ ] **`MarkdownToolbar`**: 마크다운 문법 삽입을 위한 툴바
  - 위치: NodeEditor 상단 또는 플로팅 버튼
  - 기능: 마크다운 문법 버튼, 선택 텍스트 감지
- [ ] **`MarkdownPreview`**: 편집 중 프리뷰 컴포넌트 (Split view용)
- [ ] **`MarkdownEditor`**: 고급 마크다운 에디터 (선택사항, 향후 확장)

#### 기존 컴포넌트 수정
- [x] **`Node.tsx`**: `MarkdownRenderer` 사용하도록 수정 ✅
- [x] **`NodeEditor.tsx`**: textarea 기반 multi-line 편집 지원 ✅

### 3. 기술 스택

#### 마크다운 파싱
- **권장**: `react-markdown` + `remark-gfm` (GitHub Flavored Markdown)
- **대안**: `marked` + `DOMPurify` (sanitization)
- **코드 하이라이팅**: `react-syntax-highlighter` 또는 `prism-react-renderer`

#### 에디터
- **마크다운 에디터**: `react-markdown-editor` 또는 커스텀 구현
- **Syntax Highlighting**: `react-simple-code-editor` + `prismjs`

### 4. 데이터 저장

#### 스키마 변경 (선택사항)
```typescript
// 기존 (호환성 유지)
Node {
  label: string;  // 마크다운 텍스트
}

// 확장 (옵션)
Node {
  label: string;
  labelFormat?: 'markdown' | 'plain' | 'html';
  markdownConfig?: {
    enableImages?: boolean;
    enableLinks?: boolean;
    maxHeight?: number;
  };
}
```

#### 마이그레이션 전략
1. **Phase 1**: 모든 기존 `label`을 마크다운으로 처리 (호환성 유지)
2. **Phase 2**: 사용자가 plain text를 원할 경우 명시적 설정
3. **Phase 3**: 노드별 마크다운 설정 옵션 제공

## 🚀 구현 단계

### Phase 1: 기본 마크다운 렌더링 (MVP) ✅ (완료)
- [x] `react-markdown` 설치 및 설정
- [x] `MarkdownRenderer` 컴포넌트 구현
- [x] `Node` 컴포넌트에서 `MarkdownRenderer` 사용
- [x] 기본 마크다운 문법 지원 (Bold, Italic, Links, Lists, Headings, Code, Blockquote)

**완료일**: 2025-01-31

### Phase 2: 마크다운 에디터 기본 기능 ✅ (완료)
- [x] `NodeEditor`를 textarea로 변경하여 multi-line 지원
- [x] 기본 텍스트 편집 기능 (textarea)
- [x] 저장/취소 기능
- [x] 자동 높이 조절
- [x] 기본 키보드 단축키 (Enter, Ctrl+Enter, Escape, Tab)

**완료일**: 2025-01-31

### Phase 2.5: 마크다운 에디터 도구
- [ ] **마크다운 툴바 구현**
  - [ ] 툴바 UI 컴포넌트 (`MarkdownToolbar.tsx`)
  - [ ] 툴바 위치: NodeEditor 상단 또는 플로팅 버튼
  - [ ] 툴바 버튼:
    - [ ] **Bold** (`**text**`)
    - [ ] *Italic* (`*text*`)
    - [ ] ~~Strikethrough~~ (`~~text~~`)
    - [ ] `Code` (inline code)
    - [ ] 링크 삽입 (`[text](url)`)
    - [ ] 제목 (H1, H2, H3)
    - [ ] 리스트 (순서 있음/없음)
    - [ ] 인용 (`>`)
    - [ ] 구분선 (`---`)
    - [ ] 코드 블록 (```)
- [ ] **선택 텍스트 감지**: 버튼 클릭 시 선택된 텍스트에 문법 적용
- [ ] **커서 위치 기반 삽입**: 선택 없을 때 커서 위치에 문법 삽입

**예상 기간**: 2-3일

### Phase 3: 고급 에디터 기능
- [ ] **Syntax highlighting (편집 모드)**
  - [ ] `react-simple-code-editor` 또는 `CodeMirror` 통합
  - [ ] 마크다운 문법 하이라이팅
  - [ ] 코드 블록 언어별 하이라이팅
- [ ] **실시간 프리뷰**
  - [ ] Split view 모드: 편집 영역과 프리뷰 영역 분할
  - [ ] 토글 모드: 편집/프리뷰 전환 버튼
  - [ ] 실시간 렌더링: 입력 시 즉시 프리뷰 업데이트
- [ ] **고급 키보드 단축키**
  - [ ] `Ctrl+B` / `Cmd+B`: Bold 토글
  - [ ] `Ctrl+I` / `Cmd+I`: Italic 토글
  - [ ] `Ctrl+K` / `Cmd+K`: 링크 삽입/편집
  - [ ] `Ctrl+]` / `Cmd+]`: 인용 블록
  - [ ] `Ctrl+\`` / `Cmd+\``: 코드 블록
  - [ ] `Ctrl+Shift+L` / `Cmd+Shift+L`: 리스트 삽입
- [ ] **텍스트 선택 및 편집**
  - [ ] 선택 텍스트 감지 및 스타일 적용
  - [ ] 다중 커서 지원 (선택사항)

**예상 기간**: 3-4일

### Phase 4: 최적화 및 확장
- [ ] 이미지 삽입 지원 (옵션)
- [ ] 코드 블록 하이라이팅
- [ ] 노드 크기 자동 조절
- [ ] 성능 최적화 (긴 텍스트 처리)

**예상 기간**: 2-3일

**총 예상 기간**: 8-12일

## 🔍 기술적 고려사항

### 1. SVG 렌더링
- SVG `<text>` 요소는 마크다운 HTML을 직접 렌더링할 수 없음
- **해결책**: `foreignObject` 사용하여 HTML 렌더링
- **주의사항**: 브라우저 호환성 (모던 브라우저 지원)

### 2. 성능
- **긴 마크다운 텍스트**: 가상화(virtualization) 고려
- **파싱 최적화**: 마크다운 파싱 결과 캐싱
- **렌더링 최적화**: 변경된 노드만 리렌더링

### 3. 보안
- **XSS 방지**: 마크다운 파싱 후 HTML sanitization 필수
- **DOMPurify** 사용 권장
- **링크 보안**: `rel="noopener noreferrer"` 자동 추가

### 4. 접근성
- **스크린 리더**: 마크다운 구조를 의미론적으로 전달
- **키보드 네비게이션**: 에디터 내 키보드 접근성 유지
- **ARIA 라벨**: 적절한 ARIA 속성 추가

## 📋 체크리스트

### 개발 전
- [ ] 기획 검토 및 승인
- [ ] 디자인 스펙 확정
- [ ] 기술 스택 최종 결정
- [ ] 성능 요구사항 정의

### 개발 중
- [ ] 단위 테스트 작성
- [ ] 통합 테스트 작성
- [ ] 접근성 검증
- [ ] 보안 검증

### 배포 전
- [ ] 사용자 테스트
- [ ] 성능 벤치마크
- [ ] 문서화 (사용자 가이드)
- [ ] 마이그레이션 스크립트 준비

## 🎓 사용자 가이드 (초안)

### 마크다운 기본 사용법

노드 텍스트에서 다음 문법을 사용할 수 있습니다:

- **볼드**: `**텍스트**` → **텍스트**
- *이탤릭*: `*텍스트*` → *텍스트*
- 링크: `[텍스트](https://example.com)`
- 리스트:
  ```
  - 항목 1
  - 항목 2
    - 하위 항목
  ```

### 편집 팁

#### 기본 사용법
- 노드를 **더블클릭**하여 편집 모드 진입
- 여러 줄 텍스트 입력 가능 (Enter로 새 줄)
- `Ctrl/Cmd + Enter`로 저장
- `Escape`로 취소

#### 현재 지원하는 키보드 단축키
- `Enter`: 새 줄 추가
- `Ctrl/Cmd + Enter`: 저장
- `Escape`: 취소
- `Tab`: 2칸 들여쓰기

#### 마크다운 문법 (직접 입력)
- **볼드**: `**텍스트**` → **텍스트**
- *이탤릭*: `*텍스트*` → *텍스트*
- 링크: `[텍스트](https://example.com)`
- 제목: `# H1`, `## H2`, `### H3`
- 리스트:
  ```
  - 항목 1
  - 항목 2
    - 하위 항목
  ```

#### 향후 추가 예정 (Phase 2.5, Phase 3)
- **마크다운 툴바**: 버튼 클릭으로 문법 삽입
- **키보드 단축키**: `Ctrl+B` (Bold), `Ctrl+K` (Link) 등
- **실시간 프리뷰**: 편집 중 마크다운 렌더링 미리보기
- **Syntax highlighting**: 마크다운 문법 하이라이팅

## 🔗 참고 자료

- [CommonMark Spec](https://commonmark.org/)
- [GitHub Flavored Markdown](https://github.github.com/gfm/)
- [react-markdown Documentation](https://github.com/remarkjs/react-markdown)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

## 📝 추가 고려사항

### 향후 확장 가능성
1. **WYSIWYG 에디터**: 드래그 앤 드롭으로 서식 적용
2. **테이블 지원**: 마크다운 테이블 문법
3. **수식 지원**: LaTeX 수식 삽입 (MathJax)
4. **다이어그램**: Mermaid 다이어그램 삽입
5. **플러그인 시스템**: 커스텀 마크다운 확장

### 마이그레이션 계획
- 기존 데이터는 자동으로 마크다운으로 처리
- 사용자가 원하는 경우 plain text 모드로 전환 가능
- 마이그레이션 스크립트는 불필요 (호환성 유지)

---

---

## 📊 구현 현황

### ✅ 완료된 항목
- **Phase 1**: 기본 마크다운 렌더링 (100%)
  - MarkdownRenderer 컴포넌트 구현
  - Node 컴포넌트에 통합
  - 기본 마크다운 문법 지원
- **Phase 2**: 마크다운 에디터 기본 기능 (100%)
  - Multi-line 지원 (textarea)
  - 자동 높이 조절
  - 기본 키보드 단축키

### 🚧 진행 중
- **Phase 2.5**: 마크다운 툴바 및 에디터 도구
  - MarkdownToolbar 컴포넌트 구현 예정
  - 툴바 버튼 및 기능 구현 예정

### 📅 예정
- **Phase 3**: 고급 에디터 기능 (Syntax highlighting, 프리뷰)
- **Phase 4**: 최적화 및 확장

---

**작성일**: 2025-01-31  
**최종 업데이트**: 2025-01-31  
**작성자**: Development Team  
**상태**: Phase 1, Phase 2 완료 / Phase 2.5 진행 예정

