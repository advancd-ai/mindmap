# Map.json Schema Version Management System

## 개요
map.json 파일의 데이터 저장 구조에 대한 schema format 버전 관리 시스템을 설계합니다.

## 1. Schema Version Structure

### 1.1 Root Schema Format
```json
{
  "schemaVersion": "1.0.0",
  "schemaFormat": "mindmap-v1",
  "id": "map_1760272186996",
  "title": "Sample Mind Map",
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T15:45:00Z",
    "version": 5,
    "author": "user@example.com",
    "tags": ["project", "planning"]
  },
  "data": {
    // 실제 마인드맵 데이터
  }
}
```

### 1.2 Schema Version Components

#### schemaVersion
- **형식**: Semantic Versioning (MAJOR.MINOR.PATCH)
- **용도**: Schema 구조의 호환성 관리
- **예시**: "1.0.0", "1.1.0", "2.0.0"

#### schemaFormat
- **형식**: "mindmap-v{MAJOR}"
- **용도**: Schema 형식 식별자
- **예시**: "mindmap-v1", "mindmap-v2"

## 2. Version Compatibility Matrix

| Schema Version | Format | Backward Compatible | Forward Compatible | Breaking Changes |
|----------------|--------|-------------------|-------------------|------------------|
| 1.0.0 | mindmap-v1 | N/A | 1.0.x | N/A |
| 1.1.0 | mindmap-v1 | 1.0.x | 1.1.x | No |
| 1.2.0 | mindmap-v1 | 1.1.x | 1.2.x | No |
| 2.0.0 | mindmap-v2 | 1.x.x | 2.0.x | Yes |

## 3. Migration Strategy

### 3.1 Automatic Migration
- **Minor/Patch 버전**: 자동 마이그레이션 지원
- **Major 버전**: 수동 마이그레이션 필요

### 3.2 Migration Paths
```
1.0.0 → 1.1.0 → 1.2.0 → 2.0.0
  ↓       ↓       ↓       ↓
Auto    Auto    Auto   Manual
```

## 4. Schema Registry Structure

### 4.1 Schema Definitions
```
schemas/
├── v1/
│   ├── map-v1.0.0.json
│   ├── map-v1.1.0.json
│   └── map-v1.2.0.json
├── v2/
│   ├── map-v2.0.0.json
│   └── map-v2.1.0.json
└── registry.json
```

### 4.2 Registry Format
```json
{
  "schemas": {
    "mindmap-v1": {
      "latest": "1.2.0",
      "versions": ["1.0.0", "1.1.0", "1.2.0"],
      "migrationPaths": {
        "1.0.0": ["1.1.0"],
        "1.1.0": ["1.2.0"],
        "1.2.0": ["2.0.0"]
      }
    },
    "mindmap-v2": {
      "latest": "2.0.0",
      "versions": ["2.0.0"],
      "migrationPaths": {
        "2.0.0": []
      }
    }
  }
}
```

## 5. Implementation Strategy

### 5.1 Schema Validation
```typescript
interface SchemaValidator {
  validate(data: any, version: string): ValidationResult;
  migrate(data: any, fromVersion: string, toVersion: string): any;
  getLatestVersion(format: string): string;
}
```

### 5.2 Migration Engine
```typescript
interface MigrationEngine {
  registerMigration(fromVersion: string, toVersion: string, migrator: Migrator);
  migrate(data: any, fromVersion: string, toVersion: string): any;
}
```

## 6. Backward Compatibility Rules

### 6.1 Minor Version Changes (1.0.0 → 1.1.0)
- ✅ 새로운 선택적 필드 추가
- ✅ 기존 필드의 제약 조건 완화
- ✅ 새로운 enum 값 추가
- ❌ 기존 필드 삭제
- ❌ 기존 필드 타입 변경
- ❌ 필수 필드로 변경

### 6.2 Major Version Changes (1.x.x → 2.0.0)
- ✅ 모든 변경사항 허용
- ✅ 기존 데이터 구조 완전 재설계 가능
- ✅ 마이그레이션 스크립트 제공 필수

## 7. Future Extensibility

### 7.1 Planned Schema Versions
- **v1.1.0**: 텍스트 스타일링 추가
- **v1.2.0**: 노드 그룹핑 기능
- **v2.0.0**: 3D 레이아웃 지원
- **v2.1.0**: 실시간 협업 기능

### 7.2 Extension Points
- **Metadata**: 사용자 정의 메타데이터 확장
- **Node Types**: 새로운 노드 타입 추가
- **Edge Types**: 새로운 엣지 타입 추가
- **View States**: 새로운 뷰 상태 추가

