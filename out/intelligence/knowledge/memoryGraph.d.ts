export interface MemoryNode {
    id: string;
    type: 'concept' | 'pattern' | 'error' | 'solution' | 'decision' | 'learning';
    title: string;
    content: string;
    metadata: Record<string, any>;
    createdAt: number;
    updatedAt: number;
    importance: number;
    accessCount: number;
}
export interface MemoryEdge {
    from: string;
    to: string;
    type: 'related' | 'depends-on' | 'contradicts' | 'reinforces' | 'evolves-from';
    strength: number;
}
export declare class MemoryGraph {
    private nodes;
    private edges;
    private persistencePath;
    constructor(projectRoot: string);
    addNode(node: Omit<MemoryNode, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): MemoryNode;
    private generateNodeId;
    addEdge(fromId: string, toId: string, type: MemoryEdge['type'], strength?: number): void;
    getNode(id: string): MemoryNode | undefined;
    findRelated(nodeId: string, type?: MemoryEdge['type']): MemoryNode[];
    findByType(type: MemoryNode['type']): MemoryNode[];
    search(query: string): MemoryNode[];
    traversePath(startId: string, maxDepth?: number): {
        paths: string[][];
        nodeMap: Map<string, MemoryNode>;
    };
    getMostImportantNodes(limit?: number): MemoryNode[];
    updateNode(id: string, updates: Partial<MemoryNode>): MemoryNode | null;
    deleteNode(id: string): boolean;
    getGraphStats(): {
        totalNodes: number;
        totalEdges: number;
        averageConnectivity: number;
        mostConnectedNode: string;
    };
    private loadFromDisk;
    persistToDisk(): void;
    exportGraph(): {
        nodes: MemoryNode[];
        edges: MemoryEdge[];
    };
}
export default MemoryGraph;
