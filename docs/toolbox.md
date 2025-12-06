# Floating Toolbox 기획 문서

## 개요

에디터 페이지 왼쪽에 위치하는 Floating Toolbox는 마인드맵 편집에 필요한 주요 도구들을 빠르게 접근할 수 있도록 하는 플로팅 패널입니다. Apple의 디자인 시스템을 따르며, 직관적이고 접근성 높은 UI를 제공합니다.

## 목표

1. **빠른 접근성**: 자주 사용하는 도구를 한 번의 클릭으로 접근
2. **시각적 피드백**: 현재 선택된 노드/엣지 상태에 따른 동적 도구 표시
3. **공간 효율성**: 캔버스 공간을 최대한 활용하면서도 도구에 쉽게 접근
4. **일관성**: 기존 UI/UX 패턴과 일관된 디자인

## 위치 및 레이아웃

### 위치
- **에디터 왼쪽 중앙**: 캔버스 왼쪽 가장자리에서 약간 떨어진 위치
- **플로팅**: 캔버스 위에 떠 있는 형태 (absolute positioning)
- **고정 위치**: 스크롤과 무관하게 항상 같은 위치에 고정

### 레이아웃
```
┌─────────────────────────────────────┐
│  Editor Header                       │
├─────────────────────────────────────┤
│  ┌───┐                              │
│  │ T │  MindMap Canvas              │
│  │ O │                              │
│  │ O │                              │
│  │ L │                              │
│  │ B │                              │
│  │ O │                              │
│  │ X │                              │
│  └───┘                              │
├─────────────────────────────────────┤
│  Editor Footer                       │
└─────────────────────────────────────┘
```

## 디자인 스펙

### 크기
- **너비**: 56px (고정)
- **높이**: 자동 (내용에 따라 조정, 최소 200px)
- **패딩**: 8px (내부 여백)
- **아이템 간격**: 4px

### 스타일
- **배경**: 반투명 배경 (`rgba(255, 255, 255, 0.8)`)
- **블러 효과**: `backdrop-filter: blur(20px) saturate(180%)`
- **테두리**: 얇은 테두리 (`1px solid rgba(0, 0, 0, 0.1)`)
- **그림자**: 부드러운 그림자 (`0 4px 16px rgba(0, 0, 0, 0.1)`)
- **모서리**: 둥근 모서리 (`12px`)

### 위치 계산
```css
.toolbox {
  position: fixed;
  left: 24px;  /* 왼쪽에서 24px 떨어진 위치 */
  top: 50%;
  transform: translateY(-50%);  /* 수직 중앙 정렬 */
  z-index: 1000;
}
```

## 도구 구성

### 1. 노드 생성 도구
**기본 상태 (노드 미선택)**
- **Add Node** (➕)
  - 클릭 시: 캔버스 중앙에 새 노드 생성
  - 툴팁: "Add Node (A)"

**노드 선택 상태**
- **Add Node** (➕)
  - 클릭 시: 선택된 노드 근처에 새 노드 생성
  - 툴팁: "Add Node near selected (A)"

### 2. 선택 도구
- **Select** (👆)
  - 클릭 시: 선택 모드 활성화
  - 툴팁: "Select Tool (S)"
  - 활성 상태 표시

### 3. 연결 도구
**노드 선택 시 표시**
- **Connect** (🔗)
  - 클릭 시: 연결 모드 활성화
  - 툴팁: "Connect Nodes (C)"
  - 활성 상태 표시

### 4. 편집 도구
**노드 선택 시 표시**
- **Edit** (✏️)
  - 클릭 시: 선택된 노드 편집 모드
  - 툴팁: "Edit Node (E)"
  - 단축키: `E`

**엣지 선택 시 표시**
- **Edit Edge** (✏️)
  - 클릭 시: 선택된 엣지 라벨 편집
  - 툴팁: "Edit Edge Label (E)"

### 5. 삭제 도구
**노드/엣지 선택 시 표시**
- **Delete** (🗑️)
  - 클릭 시: 확인 다이얼로그 후 삭제
  - 툴팁: "Delete (Delete)"
  - 단축키: `Delete` 또는 `Backspace`

### 6. 모양 변경 도구
**노드 선택 시 표시**
- **Change Shape** (◇)
  - 클릭 시: ShapeSelector 모달 열기
  - 툴팁: "Change Shape (S)"
  - 단축키: `S`

### 7. 임베드 도구
**노드 선택 시 표시**
- **Embed** (➕)
  - 클릭 시: EmbedDialog 열기
  - 툴팁: "Add Embed (I)"
  - 단축키: `I`

### 8. 줌 컨트롤
**항상 표시**
- **Zoom In** (🔍+)
  - 클릭 시: 줌 레벨 증가 (0.1씩)
  - 툴팁: "Zoom In (Ctrl + Plus)"
  
- **Zoom Out** (🔍-)
  - 클릭 시: 줌 레벨 감소 (0.1씩)
  - 툴팁: "Zoom Out (Ctrl + Minus)"
  
- **Reset Zoom** (⟲)
  - 클릭 시: 줌 레벨 1.0으로 리셋
  - 툴팁: "Reset Zoom (Ctrl + 0)"
  
- **Zoom Level** (100%)
  - 현재 줌 레벨 표시
  - 클릭 시: 줌 레벨 입력 다이얼로그

### 9. 뷰 컨트롤
**항상 표시**
- **Fit to Screen** (⊞)
  - 클릭 시: 모든 노드를 화면에 맞춤
  - 툴팁: "Fit to Screen (F)"
  - 단축키: `F`

- **Center View** (⊙)
  - 클릭 시: 뷰를 중앙으로 이동
  - 툴팁: "Center View (Ctrl + C)"

### 10. 도구 그룹 구분선
- 각 도구 그룹 사이에 얇은 구분선 표시
- 색상: `rgba(0, 0, 0, 0.1)`

## 상태 관리

### 상태에 따른 도구 표시

#### 1. 기본 상태 (아무것도 선택되지 않음)
```
┌──────────┐
│   ➕     │ Add Node
│   👆     │ Select
│   ───    │
│   🔍+    │ Zoom In
│   🔍-    │ Zoom Out
│   ⟲      │ Reset Zoom
│   100%   │ Zoom Level
│   ───    │
│   ⊞      │ Fit to Screen
│   ⊙      │ Center View
└──────────┘
```

#### 2. 노드 선택 상태
```
┌──────────┐
│   ➕     │ Add Node
│   👆     │ Select
│   ───    │
│   🔗     │ Connect
│   ✏️     │ Edit
│   🗑️     │ Delete
│   ───    │
│   ◇      │ Change Shape
│   ➕     │ Embed
│   ───    │
│   🔍+    │ Zoom In
│   🔍-    │ Zoom Out
│   ⟲      │ Reset Zoom
│   100%   │ Zoom Level
│   ───    │
│   ⊞      │ Fit to Screen
│   ⊙      │ Center View
└──────────┘
```

#### 3. 엣지 선택 상태
```
┌──────────┐
│   ➕     │ Add Node
│   👆     │ Select
│   ───    │
│   ✏️     │ Edit Edge
│   🗑️     │ Delete Edge
│   ───    │
│   🔍+    │ Zoom In
│   🔍-    │ Zoom Out
│   ⟲      │ Reset Zoom
│   100%   │ Zoom Level
│   ───    │
│   ⊞      │ Fit to Screen
│   ⊙      │ Center View
└──────────┘
```

#### 4. 연결 모드 활성화 상태
```
┌──────────┐
│   ➕     │ Add Node
│   👆     │ Select
│   ───    │
│   🔗 ✓   │ Connect (Active)
│   ✕      │ Cancel Connection
│   ───    │
│   🔍+    │ Zoom In
│   🔍-    │ Zoom Out
│   ⟲      │ Reset Zoom
│   100%   │ Zoom Level
│   ───    │
│   ⊞      │ Fit to Screen
│   ⊙      │ Center View
└──────────┘
```

## 인터랙션

### 버튼 스타일
- **기본 상태**: 반투명 배경, 호버 시 배경 강조
- **활성 상태**: 파란색 배경 (`rgba(0, 122, 255, 0.15)`)
- **비활성 상태**: 회색 처리, 클릭 불가
- **호버 효과**: 부드러운 애니메이션 (`transition: all 0.15s ease`)

### 애니메이션
- **등장**: 페이드 인 + 슬라이드 인 (왼쪽에서)
- **도구 변경**: 페이드 효과
- **호버**: 약간의 스케일 업 (`scale(1.05)`)
- **클릭**: 약간의 스케일 다운 (`scale(0.95)`)

### 툴팁
- **표시 위치**: 버튼 오른쪽
- **지연 시간**: 500ms
- **스타일**: 어두운 배경, 흰색 텍스트, 둥근 모서리

## 반응형 디자인

### 데스크톱 (> 1024px)
- 왼쪽 중앙에 고정
- 항상 표시

### 태블릿 (768px - 1024px)
- 왼쪽 중앙에 고정
- 약간 작은 크기 (48px 너비)
- 일부 도구 그룹 축소 가능

### 모바일 (< 768px)
- **옵션 1**: 하단 플로팅 버튼으로 변경
- **옵션 2**: 햄버거 메뉴로 숨김/표시 토글
- **옵션 3**: 왼쪽에서 슬라이드 인/아웃 패널

## 구현 세부사항

### 컴포넌트 구조
```
Toolbox/
├── Toolbox.tsx          # 메인 컴포넌트
├── Toolbox.css          # 스타일
├── ToolboxButton.tsx    # 개별 버튼 컴포넌트
└── ToolboxGroup.tsx     # 도구 그룹 컴포넌트
```

### Props 인터페이스
```typescript
interface ToolboxProps {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isConnecting: boolean;
  zoom: number;
  onAddNode: () => void;
  onConnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeShape: () => void;
  onEmbed: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onCenterView: () => void;
  isReadOnly?: boolean;
}
```

### 상태 관리
- `useMindMapStore`에서 선택된 노드/엣지 상태 읽기
- `EditorPage`에서 줌 상태 관리
- 연결 모드 상태는 `MindMapCanvas`에서 관리

### 이벤트 핸들러
- 각 버튼 클릭 시 해당 액션 실행
- 키보드 단축키와 연동
- 상태 변경 시 자동으로 도구 표시 업데이트

## 접근성

### 키보드 네비게이션
- `Tab`: 도구 간 이동
- `Enter` / `Space`: 선택된 도구 실행
- `Esc`: 현재 모드 취소

### 스크린 리더
- 각 버튼에 `aria-label` 추가
- 현재 활성화된 도구에 `aria-pressed="true"` 설정
- 도구 그룹에 `role="group"` 및 `aria-label` 추가

### 포커스 관리
- 포커스 순서: 위에서 아래로
- 포커스 링 스타일: 파란색 테두리 (`outline: 2px solid #007AFF`)

## 성능 최적화

### 렌더링 최적화
- `React.memo`로 불필요한 리렌더링 방지
- 상태 변경 시에만 업데이트
- 애니메이션은 CSS transitions 사용

### 메모이제이션
- 도구 목록 계산 결과 메모이제이션
- 이벤트 핸들러 useCallback으로 최적화

## 향후 확장 계획

### Phase 1 (기본 구현)
- ✅ 기본 도구 버튼
- ✅ 상태별 도구 표시
- ✅ 줌 컨트롤

### Phase 2 (고급 기능)
- [ ] 도구 커스터마이징
- [ ] 도구 순서 변경
- [ ] 자주 사용하는 도구 즐겨찾기
- [ ] 도구 히스토리 (되돌리기/다시하기)

### Phase 3 (고급 UI)
- [ ] 도구 그룹 접기/펼치기
- [ ] 도구 검색
- [ ] 키보드 단축키 표시
- [ ] 도구 사용 통계

## 참고 자료

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Figma Toolbox Design Patterns](https://www.figma.com/)
- 기존 컴포넌트: `ToolbarHelp`, `ContextMenu`, `ShapeSelector`

## 구현 우선순위

1. **High Priority**
   - 기본 도구 버튼 (Add Node, Edit, Delete, Connect)
   - 상태별 도구 표시
   - 줌 컨트롤

2. **Medium Priority**
   - 모양 변경, 임베드 도구
   - 뷰 컨트롤 (Fit to Screen, Center View)
   - 애니메이션 및 호버 효과

3. **Low Priority**
   - 반응형 디자인 (모바일)
   - 접근성 개선
   - 고급 기능 (Phase 2, 3)

---

**작성일**: 2025-01-XX  
**작성자**: Development Team  
**버전**: 1.0

