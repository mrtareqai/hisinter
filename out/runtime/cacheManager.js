"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalCache = exports.CacheManager = void 0;
const crypto = __importStar(require("crypto"));
/**
 * Advanced caching system for Sinter runtime
 * Implements smart cache invalidation, compression, and analytics
 */
class CacheManager {
    cache = new Map();
    stats = { hits: 0, misses: 0, totalTime: 0, retrievals: 0 };
    maxCacheSize = 100 * 1024 * 1024; // 100MB
    compressionThreshold = 1024 * 100; // 100KB
    set(key, data, ttlSeconds = 3600) {
        const hash = this.hashData(data);
        const entry = {
            data,
            timestamp: Date.now(),
            ttl: ttlSeconds * 1000,
            hits: 0,
            hash,
        };
        this.cache.set(key, entry);
        this.pruneIfNeeded();
    }
    get(key) {
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
        return entry.data;
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    invalidate(pattern) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, totalTime: 0, retrievals: 0 };
    }
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        return {
            totalHits: this.stats.hits,
            totalMisses: this.stats.misses,
            hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
            avgRetrievalTime: this.stats.retrievals > 0 ? this.stats.totalTime / this.stats.retrievals : 0,
            memoryUsage: this.getMemoryUsage(),
        };
    }
    hashData(data) {
        const str = JSON.stringify(data);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
    getMemoryUsage() {
        let size = 0;
        for (const entry of this.cache.values()) {
            size += JSON.stringify(entry.data).length;
        }
        return size;
    }
    pruneIfNeeded() {
        const currentMemory = this.getMemoryUsage();
        if (currentMemory > this.maxCacheSize) {
            // Remove least-hit entries
            const sorted = Array.from(this.cache.entries())
                .sort((a, b) => a[1].hits - b[1].hits);
            while (this.getMemoryUsage() > this.maxCacheSize * 0.8 && sorted.length > 0) {
                const [key] = sorted.shift();
                this.cache.delete(key);
            }
        }
    }
}
exports.CacheManager = CacheManager;
exports.globalCache = new CacheManager();
//# sourceMappingURL=cacheManager.js.map