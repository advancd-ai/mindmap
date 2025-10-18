# 마인드맵 줌 상태 JSON 데이터 예제

## 기본 구조

마인드맵의 줌 상태는 `viewState` 필드에 저장됩니다.

```json
{
  "id": "map_abc123def4",
  "title": "프로젝트 계획",
  "tags": ["프로젝트", "계획"],
  "nodes": [...],
  "edges": [...],
  "viewState": {
    "zoom": 1.5,
    "viewBox": {
      "x": -100,
      "y": -50,
      "width": 800,
      "height": 533
    }
  },
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "version": 3
}
```

## viewState 상세 설명

### zoom (줌 레벨)
- **타입**: number
- **범위**: 0.1 ~ 5.0
- **의미**: 
  - `1.0` = 100% (기본값)
  - `0.5` = 50% (줌 아웃)
  - `2.0` = 200% (줌 인)

### viewBox (뷰 영역)
- **타입**: object
- **구성**:
  - `x`: 뷰포트의 X 좌표 (패닝 위치)
  - `y`: 뷰포트의 Y 좌표 (패닝 위치)
  - `width`: 뷰포트 너비
  - `height`: 뷰포트 높이

## 다양한 줌 상태 예제

### 1. 기본 상태 (100% 줌)
```json
{
  "viewState": {
    "zoom": 1.0,
    "viewBox": {
      "x": 0,
      "y": 0,
      "width": 1200,
      "height": 800
    }
  }
}
```

### 2. 줌 인 상태 (150%)
```json
{
  "viewState": {
    "zoom": 1.5,
    "viewBox": {
      "x": 100,
      "y": 50,
      "width": 800,
      "height": 533
    }
  }
}
```

### 3. 줌 아웃 상태 (75%)
```json
{
  "viewState": {
    "zoom": 0.75,
    "viewBox": {
      "x": -200,
      "y": -100,
      "width": 1600,
      "height": 1067
    }
  }
}
```

### 4. 최대 줌 인 (300%)
```json
{
  "viewState": {
    "zoom": 3.0,
    "viewBox": {
      "x": 300,
      "y": 200,
      "width": 400,
      "height": 267
    }
  }
}
```

### 5. 패닝된 상태 (우측 하단으로 이동)
```json
{
  "viewState": {
    "zoom": 1.2,
    "viewBox": {
      "x": -500,
      "y": -300,
      "width": 1000,
      "height": 667
    }
  }
}
```

## 계산 공식

### viewBox 크기 계산
```javascript
const baseWidth = 1200;
const baseHeight = 800;

const viewBoxWidth = baseWidth / zoom;
const viewBoxHeight = baseHeight / zoom;
```

### 예시: 150% 줌
```javascript
zoom = 1.5;
viewBoxWidth = 1200 / 1.5 = 800;
viewBoxHeight = 800 / 1.5 = 533;
```

## 실제 사용 예제

### 완전한 마인드맵 데이터
```json
{
  "id": "map_myproject2024",
  "title": "2024년 프로젝트 계획",
  "tags": ["프로젝트", "2024", "계획"],
  "nodes": [
    {
      "id": "n_root_001",
      "label": "2024 프로젝트",
      "x": 600,
      "y": 400,
      "w": 200,
      "h": 100,
      "nodeType": "rect",
      "backgroundColor": "#3B82F6"
    },
    {
      "id": "n_feature_001",
      "label": "새 기능 개발",
      "x": 400,
      "y": 200,
      "w": 150,
      "h": 80,
      "nodeType": "circle",
      "backgroundColor": "#10B981"
    }
  ],
  "edges": [
    {
      "id": "e_001",
      "source": "n_root_001",
      "target": "n_feature_001",
      "edgeType": "straight"
    }
  ],
  "viewState": {
    "zoom": 1.8,
    "viewBox": {
      "x": 200,
      "y": 100,
      "width": 667,
      "height": 444
    }
  },
  "updatedAt": "2024-01-15T14:25:30.123Z",
  "version": 5
}
```

## 저장 시점

viewState는 다음 상황에서 저장됩니다:

1. **줌 인 버튼 클릭** 시
2. **줌 아웃 버튼 클릭** 시  
3. **줌 리셋 버튼 클릭** 시
4. **마인드맵 저장** 시 (자동으로 현재 상태 포함)

## 로드 시점

마인드맵을 열 때:

1. `viewState`가 존재하면 자동으로 적용
2. `viewState`가 없으면 기본값 (100% 줌, 중앙 위치) 사용
3. 사용자가 이전에 보던 정확한 줌 레벨과 위치로 복원

## 주의사항

- `viewState`는 선택적 필드입니다 (`viewState?`)
- 기존 마인드맵에는 `viewState`가 없을 수 있습니다
- `zoom` 값은 0.1 ~ 5.0 범위를 벗어나면 안 됩니다
- `viewBox`의 `width`와 `height`는 최소 100 이상이어야 합니다

