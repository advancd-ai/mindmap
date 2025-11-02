# 노드 인라인 편집 기능 코드 분석

## 개요

노드 인라인 편집 기능은 노드를 더블 클릭했을 때 해당 노드의 위치에 직접 에디터를 표시하여 편집할 수 있게 하는 기능입니다. 모달 팝업과 달리 노드 위에 바로 표시되므로 빠르고 직관적인 편집이 가능합니다.

## 아키텍처

### 1. 편집 모드 시스템

노드의 `contentType`에 따라 다른 에디터가 사용됩니다:

- **`text`**: `TextEditor` - 간단한 텍스트 입력/수정
- **`richeditor`**: `RichEditor` - WYSIWYG 리치 텍스트 에디터
- **`markdown`**: `NodeEditor` - 마크다운 편집기
- **미지정**: 기본값으로 `richeditor` 사용

### 2. 편집 모드 상태 관리

**`MindMapCanvas.tsx`**:
```typescript
const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
const [editorMode, setEditorMode] = useState<'text' | 'richeditor' | 'markdown' | null>(null);
```

- `editingNodeId`: 현재 편집 중인 노드의 ID
- `editorMode`: 명시적으로 설정된 편집 모드 (null이면 `contentType` 기반으로 자동 결정)

### 3. 편집 시작 (더블 클릭)

**`handleNodeDoubleClick` 함수**:
```typescript
const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
  e.stopPropagation();
  e.preventDefault();
  
  // Readonly 모드이거나 노드가 접혀있으면 편집 불가
  if (isReadOnly) {
    console.log('⏸️ Readonly mode, cannot edit node');
    return;
  }
  
  const node = map.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  
  // 노드가 접혀있으면 편집 불가
  if (node.collapsed) {
    console.log('⏸️ Node is collapsed, cannot edit');
    return;
  }
  
  // 더블 클릭 시 현재 contentType에 맞는 인라인 편집 시작
  setEditorMode(null); // 명시적 모드 없음 = 현재 contentType 기반 인라인 편집
  setEditingNodeId(nodeId);
};
```

**동작 흐름**:
1. 더블 클릭 이벤트 발생
2. readonly/ collapsed 체크
3. `editorMode`를 `null`로 설정 (자동 모드 선택)
4. `editingNodeId` 설정 → 편집 시작

### 4. 에디터 선택 로직

**렌더링 부분** (`MindMapCanvas.tsx`):
```typescript
{editingNodeId && (() => {
  const editingNode = map.nodes.find((n) => n.id === editingNodeId);
  if (!editingNode) return null;

  let actualEditorMode: 'text' | 'richeditor' | 'markdown';
  let useModal = false;
  
  if (editorMode) {
    // 명시적 모드 설정 (도구 상자 버튼) → 모달 사용
    actualEditorMode = editorMode;
    useModal = true;
  } else if (editingNode.contentType === 'markdown') {
    actualEditorMode = 'markdown';
    useModal = false; // 인라인 편집
  } else if (editingNode.contentType === 'richeditor') {
    actualEditorMode = 'richeditor';
    useModal = false; // 인라인 편집
  } else if (editingNode.contentType === 'text') {
    actualEditorMode = 'text';
    useModal = false; // 인라인 편집
  } else {
    // contentType 미지정 → 기본값 richeditor
    actualEditorMode = 'richeditor';
    useModal = false;
  }
  
  // 적절한 에디터 렌더링
  if (actualEditorMode === 'text') {
    return <TextEditor ... />;
  } else if (actualEditorMode === 'richeditor') {
    if (useModal) {
      return <RichEditorModal ... />;
    } else {
      return <RichEditor ... />; // 인라인
    }
  } else if (actualEditorMode === 'markdown') {
    if (useModal) {
      return <MarkdownEditorModal ... />;
    } else {
      return <NodeEditor ... />; // 인라인
    }
  }
})()}
```

### 5. 인라인 에디터 컴포넌트

#### TextEditor (`editors/TextEditor.tsx`)
- **위치**: SVG 내부의 `foreignObject`로 렌더링
- **입력 방식**: `<input>` 또는 `<textarea>` (내용 길이에 따라 자동 선택)
- **단축키**:
  - `Enter` (input) 또는 `Alt+Enter` (textarea): 저장
  - `Escape`: 취소
- **좌표**: `x`, `y`, `width`, `height` props로 노드 위치와 크기에 맞춤

#### RichEditor (`RichEditor.tsx`)
- **위치**: SVG 내부의 `foreignObject`로 렌더링
- **입력 방식**: `contentEditable` div
- **기능**: 
  - DOMPurify로 안전한 HTML 편집
  - 자동 크기 조정
  - 붙여넣기 처리 (HTML/텍스트)
- **단축키**:
  - `Alt+Enter`: 저장 후 종료
  - `Escape`: 취소
- **좌표**: 노드 위치에 맞춤

#### NodeEditor (`NodeEditor.tsx`)
- **위치**: SVG 내부의 `foreignObject`로 렌더링
- **입력 방식**: `<textarea>` (마크다운)
- **기능**:
  - 자동 크기 조정
  - 마크다운 문법 지원
- **단축키**:
  - `Alt+Enter`: 저장 후 종료
  - `Escape`: 취소
- **좌표**: 노드 위치에 맞춤

### 6. 저장 및 취소

**`handleSaveNodeLabel` 함수**:
```typescript
const handleSaveNodeLabel = (nodeId: string, newLabel: string) => {
  console.log('💾 Saving node label:', nodeId, newLabel);
  updateNode(nodeId, { label: newLabel });
  setEditingNodeId(null);
  setEditorMode(null);
};
```

**`handleCancelEdit` 함수**:
```typescript
const handleCancelEdit = () => {
  console.log('❌ Edit cancelled');
  setEditingNodeId(null);
  setEditorMode(null);
};
```

### 7. SVG 내부 렌더링

모든 인라인 에디터는 SVG `<foreignObject>` 내부에서 렌더링됩니다:

```tsx
<svg>
  {/* ... nodes, edges ... */}
  
  {/* Node Editor (when editing) */}
  {editingNodeId && (
    <foreignObject
      x={editingNode.x}
      y={editingNode.y}
      width={editingNode.w}
      height={editingNode.h}
    >
      <TextEditor | RichEditor | NodeEditor />
    </foreignObject>
  )}
</svg>
```

### 8. 이벤트 처리

인라인 에디터 내부의 이벤트가 캔버스 이벤트와 충돌하지 않도록 처리:

- `onClick={(e) => e.stopPropagation()}`
- `onMouseDown={(e) => e.stopPropagation()}`
- `pointerEvents="all"` (foreignObject에 설정)

## 편집 중 노드 렌더링

**중요**: 편집 중인 노드도 계속 렌더링됩니다. 에디터가 노드 위에 `foreignObject`로 렌더링되어 시각적으로 겹칩니다.

**`Node.tsx`의 `isEditing` prop**:
```typescript
isEditing={editingNodeId === node.id && editorMode === null}
```

- `editorMode === null`: 인라인 편집 중 (더블 클릭)
- `editorMode !== null`: 모달 편집 중 (편집 버튼 클릭)

**편집 중인 노드의 특별한 표시**:
- "Editor Type Label"이 노드 헤더에 표시됨 (인라인 편집 시만)
- "Edit Button"은 인라인 편집 중에는 숨김 (`!isEditing` 조건)

## 잠재적 문제점

### 1. 편집 모드 감지 문제
- `editorMode === null`일 때 `contentType` 기반으로 결정되는데, `contentType`이 제대로 설정되지 않은 경우 기본값(`richeditor`)으로 처리됨

### 2. 좌표 시스템
- SVG 좌표와 화면 좌표 간 변환이 필요할 수 있음
- `viewBox` 변환이 에디터 위치에 영향을 줄 수 있음
- 에디터는 `foreignObject`로 노드의 `x`, `y`, `w`, `h`를 직접 사용하므로 좌표 변환 없음

### 3. 포커스 관리
- 각 에디터 컴포넌트에서 `useEffect`로 `focus()` 및 커서 위치 설정
- `foreignObject` 내부의 포커스 이슈 가능성

### 4. 노드와 에디터 겹침
- **현재 상태**: 편집 중에도 원본 노드가 렌더링됨
- **시각적 충돌**: 에디터가 노드 위에 표시되어 약간 겹칠 수 있음
- **해결책 제안**: 편집 중인 노드는 `opacity: 0.3` 또는 완전히 숨김 처리 가능

### 5. 이벤트 전파
- 모든 에디터에서 `onClick`, `onMouseDown`에 `stopPropagation()` 적용
- 캔버스 배경 클릭 시 편집 취소는 `handleCanvasClick`에서 처리

### 6. 저장 로직
- **`handleBlur`**: 포커스를 잃으면 자동 저장 또는 취소
  - `TextEditor`, `RichEditor`: 내용이 있으면 저장, 없으면 취소
  - `NodeEditor`: 툴바 클릭 시 blur 무시, 외부 클릭 시 저장/취소
- **단축키**: `Alt+Enter` (저장 후 종료), `Escape` (취소)

## 상태 관리 흐름

### 편집 시작
```
사용자 더블 클릭
  ↓
handleNodeDoubleClick()
  ↓
검증 (readonly, collapsed)
  ↓
setEditorMode(null)  // 자동 모드 선택
setEditingNodeId(nodeId)
  ↓
렌더링 로직에서 contentType 기반으로 에디터 선택
  ↓
TextEditor | RichEditor | NodeEditor 렌더링
```

### 편집 종료
```
사용자 Alt+Enter 또는 Escape
  ↓
onSave() 또는 onCancel()
  ↓
handleSaveNodeLabel() 또는 handleCancelEdit()
  ↓
setEditingNodeId(null)
setEditorMode(null)
  ↓
에디터 언마운트, 원본 노드 표시
```

## 디버깅 포인트

### 1. 편집 시작 문제
**체크리스트**:
- [ ] `handleNodeDoubleClick`이 호출되는가? (콘솔 로그: `✏️ Editing node`)
- [ ] `isReadOnly`가 false인가?
- [ ] 노드가 `collapsed`가 아닌가?
- [ ] `editingNodeId`가 설정되었는가? (React DevTools)
- [ ] `editorMode`가 `null`인가? (인라인 편집)

**콘솔 로그**:
```
✏️ Editing node: <nodeId>
📝 Starting inline edit for node: <nodeId> contentType: <type>
🎯 Rendering editor: { editingNodeId, actualEditorMode, useModal, ... }
```

### 2. 에디터 렌더링 문제
**체크리스트**:
- [ ] `editingNodeId && (() => { ... })()` 조건이 true인가?
- [ ] `editingNode`가 찾아지는가? (`map.nodes.find`)
- [ ] `actualEditorMode`가 올바르게 결정되었는가?
- [ ] `useModal`이 `false`인가? (인라인 편집)

**에디터가 렌더링되지 않는 경우**:
- `editingNodeId`가 `null` 또는 undefined
- `editingNode`를 찾을 수 없음 (노드가 삭제되었거나 ID 불일치)
- `contentType`이 예상과 다름

### 3. 좌표 및 위치 문제
**체크리스트**:
- [ ] `x`, `y`, `width`, `height` 값이 노드 위치와 일치하는가?
- [ ] 에디터가 노드 위에 정확히 위치하는가?
- [ ] `foreignObject`가 올바른 크기로 렌더링되는가?

**좌표 불일치 원인**:
- `viewBox` 변환 (현재는 직접 좌표 사용으로 문제 없음)
- 노드 크기(`w`, `h`)와 실제 콘텐츠 크기 불일치
- CSS 스타일링으로 인한 오프셋

### 4. 포커스 문제
**체크리스트**:
- [ ] 에디터가 마운트되면 자동으로 포커스가 설정되는가?
- [ ] 커서 위치가 올바른가? (텍스트 끝 또는 선택 위치)
- [ ] `foreignObject` 내부에서 포커스가 작동하는가?

**포커스 문제 해결**:
```typescript
useEffect(() => {
  if (textareaRef.current || inputRef.current || editorRef.current) {
    const element = textareaRef.current || inputRef.current || editorRef.current;
    element?.focus();
    // 커서 위치 설정
  }
}, []);
```

### 5. 이벤트 전파 문제
**체크리스트**:
- [ ] 에디터 내부 클릭 시 캔버스 이벤트가 발생하는가?
- [ ] 캔버스 배경 클릭 시 편집이 취소되는가?
- [ ] 드래그 이벤트가 에디터에서 차단되는가?

**이벤트 차단 코드**:
```typescript
onClick={(e) => e.stopPropagation()}
onMouseDown={(e) => e.stopPropagation()}
pointerEvents="all"
```

### 6. 저장/취소 문제
**체크리스트**:
- [ ] `Alt+Enter`로 저장이 작동하는가?
- [ ] `Escape`로 취소가 작동하는가?
- [ ] `blur` 시 자동 저장/취소가 올바른가?
- [ ] 저장 후 `editingNodeId`가 `null`로 설정되는가?

**저장 로직 확인**:
```typescript
const handleSaveNodeLabel = (nodeId: string, newLabel: string) => {
  updateNode(nodeId, { label: newLabel });
  setEditingNodeId(null);  // 편집 종료
  setEditorMode(null);
};
```

## 실제 코드 흐름 예시

### 더블 클릭 → 인라인 편집 시나리오

1. **사용자 더블 클릭**
   ```typescript
   onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
   ```

2. **편집 시작**
   ```typescript
   handleNodeDoubleClick(e, nodeId) {
     // 검증
     if (isReadOnly || node.collapsed) return;
     
     // 상태 설정
     setEditorMode(null);  // 자동 모드
     setEditingNodeId(nodeId);
   }
   ```

3. **렌더링 결정**
   ```typescript
   {editingNodeId && (() => {
     const editingNode = map.nodes.find(...);
     if (!editingNode) return null;
     
     // editorMode가 null이면 contentType 기반 결정
     if (!editorMode) {
       if (editingNode.contentType === 'markdown') {
         return <NodeEditor ... />;
       } else if (editingNode.contentType === 'richeditor') {
         return <RichEditor ... />;
       } else {
         return <TextEditor ... />;
       }
     }
   })()}
   ```

4. **에디터 마운트**
   ```typescript
   useEffect(() => {
     if (textareaRef.current) {
       textareaRef.current.focus();
       // 커서 위치 설정
     }
   }, []);
   ```

5. **저장 또는 취소**
   ```typescript
   // Alt+Enter 또는 blur
   onSave((newLabel) => {
     updateNode(nodeId, { label: newLabel });
     setEditingNodeId(null);
   });
   
   // Escape
   onCancel(() => {
     setEditingNodeId(null);
   });
   ```

## 개선 제안

### 1. 편집 중 노드 시각적 처리
**현재**: 편집 중인 노드도 완전히 렌더링됨 (시각적 겹침 가능)
**제안**:
```typescript
// Node.tsx
const isEditing = editingNodeId === node.id && editorMode === null;
const opacity = isEditing ? 0.3 : 1;

<g opacity={opacity}>
  {/* 노드 렌더링 */}
</g>
```

### 2. 포커스 강제
**현재**: 각 에디터에서 `useEffect`로 포커스 설정
**개선**: 포커스 설정 실패 시 재시도 로직 추가
```typescript
useEffect(() => {
  const element = textareaRef.current || inputRef.current;
  if (element) {
    // 약간의 지연으로 확실히 포커스 설정
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    });
  }
}, []);
```

### 3. 에러 경계
**제안**: 에디터 렌더링 에러를 처리할 수 있는 에러 바운더리 추가
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  {editingNodeId && <EditorComponent ... />}
</ErrorBoundary>
```

### 4. 로딩 상태
**제안**: 에디터 초기화 중 로딩 인디케이터 표시 (대용량 콘텐츠 처리 시)

### 5. 편집 취소 시 변경사항 확인
**제안**: 내용이 변경되었을 때만 취소 확인 다이얼로그 표시
```typescript
const hasChanges = value !== initialValue;
if (hasChanges && shouldConfirm) {
  // 확인 다이얼로그
} else {
  onCancel();
}
```

### 6. 다중 노드 편집 방지
**현재**: 한 번에 하나의 노드만 편집 가능 (이미 구현됨)
**확인**: `editingNodeId`가 단일 값이므로 자연스럽게 보장됨

### 7. 키보드 네비게이션
**제안**: `Tab` 키로 다음 노드로 이동 후 편집하는 기능 (향후 구현)

## 성능 고려사항

1. **에디터 마운트**: 편집 중에만 마운트되므로 성능 영향 최소
2. **렌더링 최적화**: `key` prop으로 불필요한 재렌더링 방지
3. **메모리 관리**: 편집 종료 시 에디터 언마운트로 메모리 해제

## 테스트 시나리오

### 시나리오 1: 기본 인라인 편집
1. 노드 더블 클릭
2. 에디터가 노드 위에 표시됨
3. 텍스트 수정
4. `Alt+Enter`로 저장
5. 노드 레이블이 업데이트됨

### 시나리오 2: 편집 취소
1. 노드 더블 클릭
2. 텍스트 수정
3. `Escape`로 취소
4. 변경사항이 저장되지 않음

### 시나리오 3: Blur 자동 저장
1. 노드 더블 클릭
2. 텍스트 수정
3. 에디터 외부 클릭 (blur)
4. 자동 저장 또는 취소

### 시나리오 4: contentType 변경
1. `text` 모드 노드 더블 클릭 → `TextEditor`
2. 노드 헤더에서 "Rich Editor" 버튼 클릭
3. `contentType`이 `richeditor`로 변경되고 편집 시작

### 시나리오 5: Readonly 모드
1. Readonly 모드에서 노드 더블 클릭 시도
2. 편집이 시작되지 않음 (콘솔: `⏸️ Readonly mode`)

