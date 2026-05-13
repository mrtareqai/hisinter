interface CacheStats {
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    avgRetrievalTime: number;
    memoryUsage: number;
}
/**
 * Advanced caching system for Sinter runtime
 * Implements smart cache invalidation, compression, and analytics
 */
export declare class CacheManager {
    private cache;
    private stats;
    private maxCacheSize;
    private compressionThreshold;
    set<T>(key: string, data: T, ttlSeconds?: number): void;
    get<T>(key: string): T | null;
    has(key: string): boolean;
    invalidate(pattern: string | RegExp): void;
    clear(): void;
    getStats(): CacheStats;
    private hashData;
    private getMemoryUsage;
    private pruneIfNeeded;
}
export declare const globalCache: CacheManager;
export {};
