/**
 * Optimistic update utilities for version management
 */

export interface OptimisticVersionUpdate {
  mapId: string;
  currentVersion: number;
  newVersion: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export class OptimisticVersionManager {
  private pendingUpdates = new Map<string, OptimisticVersionUpdate>();
  private versionCache = new Map<string, { version: number; timestamp: number }>();

  /**
   * Save 후 optimistically 버전을 증가시킴
   */
  optimisticIncrementVersion(mapId: string, currentVersion: number): number {
    const newVersion = currentVersion + 1;
    const update: OptimisticVersionUpdate = {
      mapId,
      currentVersion,
      newVersion,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.pendingUpdates.set(mapId, update);
    this.versionCache.set(mapId, { version: newVersion, timestamp: Date.now() });

    console.log(`🚀 Optimistic version update: ${mapId} v${currentVersion} → v${newVersion}`);
    return newVersion;
  }

  /**
   * 실제 버전 히스토리에서 확인된 버전으로 업데이트
   */
  confirmVersion(mapId: string, confirmedVersion: number): void {
    const update = this.pendingUpdates.get(mapId);
    if (update) {
      update.status = 'confirmed';
      this.versionCache.set(mapId, { version: confirmedVersion, timestamp: Date.now() });
      console.log(`✅ Version confirmed: ${mapId} v${confirmedVersion}`);
    }
  }

  /**
   * 버전 업데이트 실패 처리
   */
  failVersionUpdate(mapId: string): void {
    const update = this.pendingUpdates.get(mapId);
    if (update) {
      update.status = 'failed';
      // 캐시에서 제거하여 원래 버전으로 되돌림
      this.versionCache.delete(mapId);
      console.log(`❌ Version update failed: ${mapId}`);
    }
  }

  /**
   * 현재 예상 버전 반환 (optimistic 또는 cached)
   */
  getExpectedVersion(mapId: string, fallbackVersion: number): number {
    const cached = this.versionCache.get(mapId);
    if (cached) {
      // 5분 이내의 캐시만 유효
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.version;
      } else {
        this.versionCache.delete(mapId);
      }
    }

    const pending = this.pendingUpdates.get(mapId);
    if (pending && pending.status === 'pending') {
      return pending.newVersion;
    }

    return fallbackVersion;
  }

  /**
   * 최신 버전 여부를 optimistic하게 판단
   */
  isOptimisticallyLatest(mapId: string, currentVersion: number): boolean {
    const expectedVersion = this.getExpectedVersion(mapId, currentVersion);
    return currentVersion >= expectedVersion;
  }

  /**
   * 대기 중인 업데이트가 있는지 확인
   */
  hasPendingUpdate(mapId: string): boolean {
    const update = this.pendingUpdates.get(mapId);
    return update ? update.status === 'pending' : false;
  }

  /**
   * 특정 맵의 optimistic 상태 초기화
   */
  clearOptimisticState(mapId: string): void {
    this.pendingUpdates.delete(mapId);
    this.versionCache.delete(mapId);
    console.log(`🧹 Cleared optimistic state for: ${mapId}`);
  }

  /**
   * 모든 optimistic 상태 초기화
   */
  clearAllOptimisticStates(): void {
    this.pendingUpdates.clear();
    this.versionCache.clear();
    console.log(`🧹 Cleared all optimistic states`);
  }

  /**
   * 디버깅용 상태 정보 반환
   */
  getDebugInfo(): Record<string, any> {
    return {
      pendingUpdates: Array.from(this.pendingUpdates.entries()).map(([mapId, update]) => ({
        id: mapId,
        ...update
      })),
      versionCache: Array.from(this.versionCache.entries()).map(([mapId, cache]) => ({
        id: mapId,
        ...cache
      }))
    };
  }
}

// 싱글톤 인스턴스
export const optimisticVersionManager = new OptimisticVersionManager();
