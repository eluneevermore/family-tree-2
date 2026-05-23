declare module 'elkjs/lib/elk.bundled.js' {
  export interface ElkNode {
    id: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    layoutOptions?: Record<string, string>;
    children?: ElkNode[];
    edges?: Array<{
      id: string;
      sources: string[];
      targets: string[];
    }>;
  }

  export default class ELK {
    layout(graph: ElkNode): Promise<ElkNode>;
  }
}
