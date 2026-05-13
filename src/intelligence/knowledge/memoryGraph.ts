import * as fs from 'fs';
import * as path from 'path';

export interface MemoryNode {
  id: string;
  type: 'concept' | 'pattern' | 'error' | 'solution' | 'decision' | 'learning';
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  importance: number; // 0-1
  accessCount: number;
}

export interface MemoryEdge {
  from: string;
  to: string;
  type: 'related' | 'depends-on' | 'contradicts' | 'reinforces' | 'evolves-from';
  strength: number; // 0-1
}

export class MemoryGraph {
  private nodes: Map<string, MemoryNode> = new Map();
  private edges: MemoryEdge[] = [];
  private persistencePath: string;

  constructor(projectRoot: string) {
    this.persistencePath = path.join(projectRoot, '.sinter', 'memory-graph.json');
    this.loadFromDisk();
  }

  public addNode(node: Omit<MemoryNode, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): MemoryNode {
    const id = this.generateNodeId(node.type, node.title);
    const memoryNode: MemoryNode = {
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

  private generateNodeId(type: string, title: string): string {
    const timestamp = Date.now();
    const sanitized = title.toLowerCase().replace(/\s+/g, '-').substring(0, 20);
    return `${type}-${sanitized}-${timestamp}`;
  }

  public addEdge(
    fromId: string,
    toId: string,
    type: MemoryEdge['type'],
    strength: number = 0.8
  ): void {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      console.warn('[Sinter] Cannot create edge - one or both nodes do not exist');
      return;
    }

    const edge: MemoryEdge = { from: fromId, to: toId, type, strength };
    this.edges.push(edge);
    this.persistToDisk();
  }

  public getNode(id: string): MemoryNode | undefined {
    const node = this.nodes.get(id);
    if (node) {
      node.accessCount++;
      node.updatedAt = Date.now();
    }
    return node;
  }

  public findRelated(nodeId: string, type?: MemoryEdge['type']): MemoryNode[] {
    const related: MemoryNode[] = [];
    const edges = this.edges.filter(
      (e) => e.from === nodeId && (!type || e.type === type)
    );

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

  public findByType(type: MemoryNode['type']): MemoryNode[] {
    return Array.from(this.nodes.values()).filter((node) => node.type === type);
  }

  public search(query: string): MemoryNode[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.nodes.values()).filter((node) => {
      return (
        node.title.toLowerCase().includes(queryLower) ||
        node.content.toLowerCase().includes(queryLower)
      );
    });
  }

  public traversePath(
    startId: string,
    maxDepth: number = 3
  ): {
    paths: string[][];
    nodeMap: Map<string, MemoryNode>;
  } {
    const paths: string[][] = [];
    const visited = new Set<string>();
    const nodeMap = new Map<string, MemoryNode>();

    const dfs = (nodeId: string, path: string[], depth: number) => {
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
      } else {
        neighbors.forEach((edge) => {
          dfs(edge.to, [...path], depth + 1);
        });
      }
    };

    dfs(startId, [], 0);

    return { paths, nodeMap };
  }

  public getMostImportantNodes(limit: number = 10): MemoryNode[] {
    return Array.from(this.nodes.values())
      .sort((a, b) => {
        const scoreA = a.importance + a.accessCount * 0.01;
        const scoreB = b.importance + b.accessCount * 0.01;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  public updateNode(id: string, updates: Partial<MemoryNode>): MemoryNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    Object.assign(node, updates, { updatedAt: Date.now() });
    this.persistToDisk();
    return node;
  }

  public deleteNode(id: string): boolean {
    if (!this.nodes.delete(id)) return false;

    // Remove related edges
    this.edges = this.edges.filter((e) => e.from !== id && e.to !== id);
    this.persistToDisk();
    return true;
  }

  public getGraphStats(): {
    totalNodes: number;
    totalEdges: number;
    averageConnectivity: number;
    mostConnectedNode: string;
  } {
    const connectivityMap = new Map<string, number>();

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

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = JSON.parse(fs.readFileSync(this.persistencePath, 'utf-8'));
        data.nodes?.forEach((node: MemoryNode) => {
          this.nodes.set(node.id, node);
        });
        this.edges = data.edges || [];
      }
    } catch (error) {
      console.error('[Sinter] Failed to load memory graph:', error);
    }
  }

  public persistToDisk(): void {
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
    } catch (error) {
      console.error('[Sinter] Failed to persist memory graph:', error);
    }
  }

  public exportGraph(): {
    nodes: MemoryNode[];
    edges: MemoryEdge[];
  } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }
}

export default MemoryGraph;
