# `e` 키 동작 문제 분석 및 해결

## 문제 증상

`e` 키를 눌렀을 때 선택된 노드의 편집 모드로 진입하지 않는 문제

---

## 코드 분석

### 1. 현재 구현 구조

```typescript
// useEffect 내부에서 이벤트 리스너 등록
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... 키보드 이벤트 처리
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [
  isDragging, 
  isResizing, 
  isConnecting, 
  isPanning, 
  editingNodeId, 
  editingEdgeId, 
  selectedNodeId, 
  selectedEdgeId, 
  map, 
  deleteNode, 
  deleteEdge, 
  selectNode, 
  selectEdge, 
  clearAllSelections,
  isReadOnly
]);
```

### 2. `e` 키 처리 로직

```typescript
else if ((e.key === 'e' || e.key === 'E') && !isTextInputFocused && !isReadOnly) {
  console.log('⌨️ e key pressed', { ... });
  
  if (selectedNodeId && !editingNodeId && !editingEdgeId && map) {
    e.preventDefault();
    const node = map.nodes.find((n) => n.id === selectedNodeId);
    if (node) {
      // 편집 모드 설정
      setEditorMode(node.contentType === 'markdown' ? 'markdown' : 'richeditor');
      setEditingNodeId(selectedNodeId);
    }
  }
}
```

---

## 🔍 발견된 문제점

### 문제 1: 의존성 배열 과다로 인한 리스너 재등록

**문제점**:
- `useEffect`의 의존성 배열에 13개의 값이 포함되어 있음
- 이 중 하나라도 변경되면 `handleKeyDown` 함수가 재생성되고 이벤트 리스너가 재등록됨
- 잦은 재등록으로 인해 이벤트가 제대로 캡처되지 않을 수 있음

**영향**:
```typescript
// 의존성 중 하나만 변경되어도:
isPanning = true → false  // 리스너 재등록
editingNodeId = null → 'some-id'  // 리스너 재등록
selectedNodeId = null → 'some-id'  // 리스너 재등록
// → 불필요한 재등록 발생
```

### 문제 2: 클로저 스코프 문제

**문제점**:
- `handleKeyDown` 함수가 생성될 때의 상태 값을 캡처함 (클로저)
- 의존성이 변경되어 함수가 재생성되기 전까지는 오래된 상태 값을 참조할 수 있음

**예시**:
```typescript
// 초기 렌더링 시:
selectedNodeId = null  // handleKeyDown이 이 값을 캡처

// 나중에:
selectedNodeId = 'node-123'  // 하지만 handleKeyDown은 여전히 null을 참조

// useEffect가 재실행되지 않으면:
// → 'node-123'을 선택했지만 handleKeyDown은 null을 참조
```

### 문제 3: SVG 포커스 보장 부족

**현재 구현**:
```typescript
// 노드 선택 시
const handleNodeSelect = (e: React.MouseEvent, nodeId: string) => {
  selectNode(nodeId);
  if (svgRef.current) {
    svgRef.current.focus();  // 포커스 시도
  }
};
```

**문제점**:
- SVG 포커스가 실패할 수 있음 (다른 요소가 포커스를 받았을 때)
- 포커스가 설정되었는지 확인하는 로직 없음
- `tabIndex={0}`이 설정되어 있어도 포커스를 받지 못할 수 있음

### 문제 4: 조건 체크 순서

**현재 로직**:
```typescript
else if ((e.key === 'e' || e.key === 'E') && !isTextInputFocused && !isReadOnly) {
  // 조건 체크 후 처리
  if (selectedNodeId && !editingNodeId && !editingEdgeId && map) {
    // ...
  }
}
```

**문제점**:
- 모든 조건이 동시에 만족되어야 함
- 하나라도 실패하면 아무 동작도 하지 않음
- 디버깅이 어려움

### 문제 5: 이벤트 캡처 단계 미사용

**현재**:
```typescript
document.addEventListener('keydown', handleKeyDown);
```

**문제점**:
- 기본적으로 버블링 단계에서만 동작
- 다른 이벤트 핸들러가 먼저 이벤트를 처리하고 `preventDefault()` 호출 시 동작 불가

---

## 💡 해결 방안

### 해결책 1: useCallback으로 함수 최적화

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // 텍스트 입력 중인지 확인
  const activeElement = document.activeElement;
  const isTextInputFocused = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.getAttribute('contenteditable') === 'true'
  );

  // 'e' 키 처리
  if (e.key.toLowerCase() === 'e' && !isTextInputFocused && !isReadOnly) {
    // 최신 상태를 직접 가져옴 (클로저 문제 해결)
    const currentState = useMindMapStore.getState();
    const { selectedNodeId, editingNodeId, editingEdgeId, map } = currentState;
    
    if (selectedNodeId && !editingNodeId && !editingEdgeId && map) {
      e.preventDefault();
      const node = map.nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        const mode = node.contentType === 'markdown' ? 'markdown' : 'richeditor';
        setEditorMode(mode);
        setEditingNodeId(selectedNodeId);
      }
    }
  }
  // ... 다른 키 처리
}, [isReadOnly, setEditorMode, setEditingNodeId]);

useEffect(() => {
  document.addEventListener('keydown', handleKeyDown);
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}, [handleKeyDown]);
```

**장점**:
- 함수 재생성 최소화
- 최신 상태를 직접 참조하여 클로저 문제 해결

### 해결책 2: 이벤트 캡처 단계 사용

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // ... 키 처리 로직
  };
  
  // 캡처 단계에서 이벤트 리스너 등록 (우선순위 높음)
  document.addEventListener('keydown', handleKeyDown, true);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}, [/* 최소한의 의존성만 */]);
```

**장점**:
- 다른 이벤트 핸들러보다 먼저 실행됨
- 이벤트가 가로채지도록 보장

### 해결책 3: SVG 포커스 강제 설정

```typescript
const handleNodeSelect = useCallback((e: React.MouseEvent, nodeId: string) => {
  e.stopPropagation();
  if (!isDragging) {
    selectNode(nodeId);
    
    // 포커스를 강제로 설정 (약간의 지연으로 다른 이벤트보다 나중에 실행)
    setTimeout(() => {
      if (svgRef.current) {
        svgRef.current.focus();
        console.log('✅ SVG focused:', document.activeElement === svgRef.current);
      }
    }, 0);
  }
}, [isDragging, selectNode]);
```

**장점**:
- 포커스 설정이 확실하게 이루어짐
- 디버깅 로그로 확인 가능

### 해결책 4: 조건 체크 개선 및 조기 반환

```typescript
// 'e' 키: 선택된 노드 편집 모드 진입
if (e.key.toLowerCase() === 'e' && !isTextInputFocused && !isReadOnly) {
  // 조기 반환으로 중첩 제거
  if (!selectedNodeId) {
    console.debug('No node selected');
    return;
  }
  
  if (editingNodeId || editingEdgeId) {
    console.debug('Already editing');
    return;
  }
  
  if (!map) {
    console.debug('No map available');
    return;
  }
  
  e.preventDefault();
  const node = map.nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    console.warn('Node not found:', selectedNodeId);
    selectNode(null);  // 불일치 상태 해결
    return;
  }
  
  // 편집 모드 설정
  const mode = node.contentType === 'markdown' ? 'markdown' : 'richeditor';
  setEditorMode(mode);
  setEditingNodeId(selectedNodeId);
  console.log('✅ Edit mode entered via e key:', selectedNodeId);
}
```

**장점**:
- 가독성 향상
- 각 조건별로 명확한 디버깅 가능

### 해결책 5: Zustand store 직접 참조

**가장 권장되는 방법**:

```typescript
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // 텍스트 입력 중인지 확인
  const activeElement = document.activeElement;
  const isTextInputFocused = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.getAttribute('contenteditable') === 'true'
  );

  if (e.key.toLowerCase() === 'e' && !isTextInputFocused && !isReadOnly) {
    // Zustand store에서 최신 상태를 직접 가져옴 (클로저 문제 완전 해결)
    const { selectedNodeId, editingNodeId, editingEdgeId, map } = useMindMapStore.getState();
    
    if (!selectedNodeId || editingNodeId || editingEdgeId || !map) {
      return;
    }
    
    e.preventDefault();
    
    const node = map.nodes.find((n) => n.id === selectedNodeId);
    if (!node) {
      console.warn('Node not found:', selectedNodeId);
      useMindMapStore.getState().selectNode(null);
      return;
    }
    
    const mode = node.contentType === 'markdown' ? 'markdown' : 'richeditor';
    useMindMapStore.getState().updateNode(selectedNodeId, {}); // 실제로는 setState 사용
    // 또는 setEditorMode, setEditingNodeId 사용 (컴포넌트 상태)
    // ...
  }
}, [isReadOnly]);

useEffect(() => {
  document.addEventListener('keydown', handleKeyDown, true); // 캡처 단계
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}, [handleKeyDown]);
```

---

## 🔧 최종 권장 솔루션

### 통합 해결책

```typescript
// 1. useCallback으로 함수 최적화
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  // 텍스트 입력 중인지 확인
  const activeElement = document.activeElement;
  const isTextInputFocused = activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.getAttribute('contenteditable') === 'true'
  );

  // 'e' 키: 선택된 노드 편집 모드 진입
  if (e.key.toLowerCase() === 'e' && !isTextInputFocused && !isReadOnly) {
    // 최신 상태를 직접 가져옴 (클로저 문제 해결)
    const { selectedNodeId, editingNodeId, editingEdgeId, map } = useMindMapStore.getState();
    
    // 조기 반환
    if (!selectedNodeId || editingNodeId || editingEdgeId || !map) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 방지
    
    const node = map.nodes.find((n) => n.id === selectedNodeId);
    if (!node) {
      console.warn('Node not found:', selectedNodeId);
      useMindMapStore.getState().selectNode(null);
      return;
    }
    
    // 편집 모드 설정
    const mode = node.contentType === 'markdown' ? 'markdown' : 'richeditor';
    setEditorMode(mode);
    setEditingNodeId(selectedNodeId);
  }
  // ... 다른 키 처리 (Escape, Delete 등)
}, [isReadOnly, setEditorMode, setEditingNodeId]);

// 2. 이벤트 리스너를 캡처 단계에서 등록
useEffect(() => {
  document.addEventListener('keydown', handleKeyDown, true); // 캡처 단계
  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}, [handleKeyDown]);

// 3. SVG 포커스 강제 설정 개선
const handleNodeSelect = useCallback((e: React.MouseEvent, nodeId: string) => {
  e.stopPropagation();
  if (!isDragging) {
    selectNode(nodeId);
    
    // requestAnimationFrame으로 다음 프레임에서 포커스 설정
    requestAnimationFrame(() => {
      if (svgRef.current) {
        svgRef.current.focus();
      }
    });
  }
}, [isDragging, selectNode]);
```

---

## 🧪 디버깅 체크리스트

문제 해결을 위해 다음을 확인하세요:

1. **콘솔 로그 확인**
   - `⌨️ e key pressed` 로그가 나타나는지 확인
   - 조건 값들이 올바른지 확인

2. **SVG 포커스 확인**
   ```javascript
   // 브라우저 콘솔에서 실행
   document.querySelector('.mindmap-canvas') === document.activeElement
   ```

3. **이벤트 리스너 확인**
   ```javascript
   // 브라우저 콘솔에서 실행
   getEventListeners(document).keydown
   ```

4. **상태 확인**
   ```javascript
   // React DevTools에서 확인
   // - selectedNodeId가 null이 아닌지
   // - editingNodeId가 null인지
   // - map이 존재하는지
   ```

5. **다른 이벤트 핸들러 확인**
   - 다른 컴포넌트에서 `e` 키를 가로채는지 확인
   - 전역 키보드 단축키가 충돌하는지 확인

---

## 📊 문제 발생 가능성 체크리스트

- [ ] SVG 포커스 미설정
- [ ] 이벤트 리스너 미등록
- [ ] 클로저로 인한 오래된 상태 참조
- [ ] 다른 이벤트 핸들러가 이벤트 가로채기
- [ ] 조건 체크 실패 (selectedNodeId, editingNodeId, map 등)
- [ ] 텍스트 입력 필드에 포커스가 있어서 무시됨
- [ ] 읽기 전용 모드에서 동작 안 함

---

## ✅ 최종 권장 사항

1. **즉시 적용**: Zustand store 직접 참조로 클로저 문제 해결
2. **즉시 적용**: 이벤트 캡처 단계 사용
3. **즉시 적용**: SVG 포커스 강제 설정 개선
4. **점진적 적용**: useCallback으로 최적화
5. **점진적 적용**: 조건 체크 개선 및 조기 반환

이 방법들을 적용하면 `e` 키 동작 문제가 해결될 것입니다.

---

**문서 작성일**: 2024년
**최종 업데이트**: 2024년

