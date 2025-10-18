/**
 * Version synchronization utilities
 */

export interface VersionSyncOptions {
  maxRetries: number;
  retryInterval: number;
  timeout: number;
}

export class VersionSynchronizer {
  private retryCount = 0;
  private maxRetries: number;
  private retryInterval: number;
  private timeout: number;

  constructor(options: VersionSyncOptions = {
    maxRetries: 10,
    retryInterval: 2000, // 2초마다 재시도
    timeout: 30000 // 30초 타임아웃
  }) {
    this.maxRetries = options.maxRetries;
    this.retryInterval = options.retryInterval;
    this.timeout = options.timeout;
  }

  /**
   * Polling 방식으로 최신 버전이 반영될 때까지 대기
   */
  async waitForLatestVersion(
    mapId: string,
    expectedVersion: number,
    fetchHistory: (mapId: string) => Promise<any[]>,
    onProgress?: (attempt: number, latestVersion: number) => void
  ): Promise<number> {
    const startTime = Date.now();
    this.retryCount = 0;

    while (this.retryCount < this.maxRetries) {
      // 타임아웃 체크
      if (Date.now() - startTime > this.timeout) {
        throw new Error(`Timeout waiting for version ${expectedVersion} to be available`);
      }

      try {
        console.log(`🔄 Checking for version ${expectedVersion} (attempt ${this.retryCount + 1})`);
        
        const history = await fetchHistory(mapId);
        if (history && history.length > 0) {
          const latestVersion = Math.max(...history.map(v => v.version));
          
          if (onProgress) {
            onProgress(this.retryCount + 1, latestVersion);
          }

          if (latestVersion >= expectedVersion) {
            console.log(`✅ Version ${expectedVersion} is now available (latest: ${latestVersion})`);
            return latestVersion;
          }

          console.log(`⏳ Version ${expectedVersion} not yet available (latest: ${latestVersion})`);
        }

        // 다음 재시도까지 대기
        await this.delay(this.retryInterval);
        this.retryCount++;

      } catch (error) {
        console.error(`❌ Error checking version (attempt ${this.retryCount + 1}):`, error);
        
        // 에러가 발생해도 재시도
        await this.delay(this.retryInterval);
        this.retryCount++;
      }
    }

    throw new Error(`Failed to find version ${expectedVersion} after ${this.maxRetries} attempts`);
  }

  /**
   * 지수 백오프 방식으로 재시도 간격 증가
   */
  async waitForLatestVersionWithBackoff(
    mapId: string,
    expectedVersion: number,
    fetchHistory: (mapId: string) => Promise<any[]>,
    onProgress?: (attempt: number, latestVersion: number, nextDelay: number) => void
  ): Promise<number> {
    const startTime = Date.now();
    this.retryCount = 0;
    let delay = 1000; // 1초부터 시작

    while (this.retryCount < this.maxRetries) {
      if (Date.now() - startTime > this.timeout) {
        throw new Error(`Timeout waiting for version ${expectedVersion} to be available`);
      }

      try {
        console.log(`🔄 Checking for version ${expectedVersion} (attempt ${this.retryCount + 1}, delay: ${delay}ms)`);
        
        const history = await fetchHistory(mapId);
        if (history && history.length > 0) {
          const latestVersion = Math.max(...history.map(v => v.version));
          
          if (onProgress) {
            onProgress(this.retryCount + 1, latestVersion, delay);
          }

          if (latestVersion >= expectedVersion) {
            console.log(`✅ Version ${expectedVersion} is now available (latest: ${latestVersion})`);
            return latestVersion;
          }

          console.log(`⏳ Version ${expectedVersion} not yet available (latest: ${latestVersion})`);
        }

        await this.delay(delay);
        
        // 지수 백오프: 최대 5초까지 증가
        delay = Math.min(delay * 1.5, 5000);
        this.retryCount++;

      } catch (error) {
        console.error(`❌ Error checking version (attempt ${this.retryCount + 1}):`, error);
        
        await this.delay(delay);
        delay = Math.min(delay * 1.5, 5000);
        this.retryCount++;
      }
    }

    throw new Error(`Failed to find version ${expectedVersion} after ${this.maxRetries} attempts`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 재시도 횟수 초기화
   */
  reset(): void {
    this.retryCount = 0;
  }
}

// 싱글톤 인스턴스
export const versionSynchronizer = new VersionSynchronizer();

