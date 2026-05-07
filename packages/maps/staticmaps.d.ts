declare module 'staticmaps' {
  interface StaticMapsOptions {
    width: number;
    height: number;
    paddingX?: number;
    paddingY?: number;
    tileLayers?: Array<{ tileUrl: string; tileSize?: number }>;
  }

  interface LineOptions {
    coords: [number, number][];
    color?: string;
    width?: number;
  }

  interface CircleOptions {
    coord: [number, number];
    radius: number;
    fill?: string;
    color?: string;
    width?: number;
  }

  interface TextOptions {
    coord: [number, number];
    text: string;
    color?: string;
    fill?: string;
    width?: number;
    size?: number;
    font?: string;
    anchor?: string;
    offsetX?: number;
    offsetY?: number;
  }

  interface MapImage {
    save(path: string): Promise<void>;
  }

  class StaticMaps {
    constructor(options: StaticMapsOptions);
    image: MapImage;
    addLine(options: LineOptions): void;
    addCircle(options: CircleOptions): void;
    addText(options: TextOptions): void;
    render(center?: [number, number], zoom?: number): Promise<void>;
  }

  export default StaticMaps;
}
