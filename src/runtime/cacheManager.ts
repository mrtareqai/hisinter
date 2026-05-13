import * as crypto from 'crypto';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
    hash: string;
}

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
export class CacheManager {
    private cache = new Map<string, CacheEntry<any>>();
    private stats = { hits: 0, misses: 0, totalTime: 0, retrievals: 0 };
    private maxCacheSize = 100 * 1024 * 1024; // 100MB
    private compressionThreshold = 1024 * 100; // 100KB

    set<T>(key: string, data: T, ttlSeconds = 3600): void {
        const hash = this.hashData(data);
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttlSeconds * 1000,
            hits: 0,
            hash,
        };

        this.cache.set(key, entry);
        this.pruneIfNeeded();
    }

    get<T>(key: string): T | null {
        const start = performance.now();
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        entry.hits++;
        this.stats.hits++;
        this.stats.totalTime += performance.now() - start;
        this.stats.retrievals++;

        return entry.data as T;
    }

    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    invalidate(pattern: string | RegExp): void {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    clear(): void {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, totalTime: 0, retrievals: 0 };
    }

    getStats(): CacheStats {
        const totalRequests = this.stats.hits + this.stats.misses;
        return {
            totalHits: this.stats.hits,
            totalMisses: this.stats.misses,
            hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
            avgRetrievalTime: this.stats.retrievals > 0 ? this.stats.totalTime / this.stats.retrievals : 0,
            memoryUsage: this.getMemoryUsage(),
        };
    }

    private hashData(data: any): string {
        const str = JSON.stringify(data);
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    private getMemoryUsage(): number {
        let size = 0;
        for (const entry of this.cache.values()) {
            size += JSON.stringify(entry.data).length;
        }
        return size;
    }

    private pruneIfNeeded(): void {
        const currentMemory = this.getMemoryUsage();
        if (currentMemory > this.maxCacheSize) {
            // Remove least-hit entries
            const sorted = Array.from(this.cache.entries())
                .sort((a, b) => a[1].hits - b[1].hits);

            while (this.getMemoryUsage() > this.maxCacheSize * 0.8 && sorted.length > 0) {
                const [key] = sorted.shift()!;
                this.cache.delete(key);
            }
        }
    }
}

export const globalCache = new CacheManager();
