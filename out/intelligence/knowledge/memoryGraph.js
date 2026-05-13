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
exports.MemoryGraph = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MemoryGraph {
    nodes = new Map();
    edges = [];
    persistencePath;
    constructor(projectRoot) {
        this.persistencePath = path.join(projectRoot, '.sinter', 'memory-graph.json');
        this.loadFromDisk();
    }
    addNode(node) {
        const id = this.generateNodeId(node.type, node.title);
        const memoryNode = {
            ...node,
            id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            accessCount: 0,
        };
        this.nodes.set(id, memoryNode);
        this.persistToDisk();
        return memoryNode;
    }
    generateNodeId(type, title) {
        const timestamp = Date.now();
        const sanitized = title.toLowerCase().replace(/\s+/g, '-').substring(0, 20);
        return `${type}-${sanitized}-${timestamp}`;
    }
    addEdge(fromId, toId, type, strength = 0.8) {
        if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
            console.warn('[Sinter] Cannot create edge - one or both nodes do not exist');
            return;
        }
        const edge = { from: fromId, to: toId, type, strength };
        this.edges.push(edge);
        this.persistToDisk();
    }
    getNode(id) {
        const node = this.nodes.get(id);
        if (node) {
            node.accessCount++;
            node.updatedAt = Date.now();
        }
        return node;
    }
    findRelated(nodeId, type) {
        const related = [];
        const edges = this.edges.filter((e) => e.from === nodeId && (!type || e.type === type));
        edges.forEach((edge) => {
            const node = this.nodes.get(edge.to);
            if (node) {
                related.push(node);
            }
        });
        // Sort by edge strength
        return related.sort((a, b) => {
            const aEdge = edges.find((e) => e.to === a.id);
            const bEdge = edges.find((e) => e.to === b.id);
            return (bEdge?.strength || 0) - (aEdge?.strength || 0);
        });
    }
    findByType(type) {
        return Array.from(this.nodes.values()).filter((node) => node.type === type);
    }
    search(query) {
        const queryLower = query.toLowerCase();
        return Array.from(this.nodes.values()).filter((node) => {
            return (node.title.toLowerCase().includes(queryLower) ||
                node.content.toLowerCase().includes(queryLower));
        });
    }
    traversePath(startId, maxDepth = 3) {
        const paths = [];
        const visited = new Set();
        const nodeMap = new Map();
        const dfs = (nodeId, path, depth) => {
            if (depth > maxDepth || visited.has(nodeId)) {
                return;
            }
            visited.add(nodeId);
            path.push(nodeId);
            const node = this.nodes.get(nodeId);
            if (node) {
                nodeMap.set(nodeId, node);
            }
            const neighbors = this.edges.filter((e) => e.from === nodeId);
            if (neighbors.length === 0) {
                paths.push([...path]);
            }
            else {
                neighbors.forEach((edge) => {
                    dfs(edge.to, [...path], depth + 1);
                });
            }
        };
        dfs(startId, [], 0);
        return { paths, nodeMap };
    }
    getMostImportantNodes(limit = 10) {
        return Array.from(this.nodes.values())
            .sort((a, b) => {
            const scoreA = a.importance + a.accessCount * 0.01;
            const scoreB = b.importance + b.accessCount * 0.01;
            return scoreB - scoreA;
        })
            .slice(0, limit);
    }
    updateNode(id, updates) {
        const node = this.nodes.get(id);
        if (!node)
            return null;
        Object.assign(node, updates, { updatedAt: Date.now() });
        this.persistToDisk();
        return node;
    }
    deleteNode(id) {
        if (!this.nodes.delete(id))
            return false;
        // Remove related edges
        this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);
        this.persistToDisk();
        return true;
    }
    getGraphStats() {
        const connectivityMap = new Map();
        this.edges.forEach((edge) => {
            connectivityMap.set(edge.from, (connectivityMap.get(edge.from) || 0) + 1);
            connectivityMap.set(edge.to, (connectivityMap.get(edge.to) || 0) + 1);
        });
        let mostConnected = '';
        let maxConnectivity = 0;
        connectivityMap.forEach((count, nodeId) => {
            if (count > maxConnectivity) {
                maxConnectivity = count;
                mostConnected = nodeId;
            }
        });
        const avgConnectivity = this.edges.length > 0
            ? (this.edges.length * 2) / this.nodes.size
            : 0;
        return {
            totalNodes: this.nodes.size,
            totalEdges: this.edges.length,
            averageConnectivity: avgConnectivity,
            mostConnectedNode: mostConnected,
        };
    }
    loadFromDisk() {
        try {
            if (fs.existsSync(this.persistencePath)) {
                const data = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'));
                data.nodes?.forEach((node) => {
                    this.nodes.set(node.id, node);
                });
                this.edges = data.edges || [];
            }
        }
        catch (error) {
            console.error('[Sinter] Failed to load memory graph:', error);
        }
    }
    persistToDisk() {
        try {
            const dir = path.dirname(this.persistencePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = {
                nodes: Array.from(this.nodes.values()),
                edges: this.edges,
            };
            fs.writeFileSync(this.persistencePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('[Sinter] Failed to persist memory graph:', error);
        }
    }
    exportGraph() {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges,
        };
    }
}
exports.MemoryGraph = MemoryGraph;
exports.default = MemoryGraph;
//# sourceMappingURL=memoryGraph.js.map