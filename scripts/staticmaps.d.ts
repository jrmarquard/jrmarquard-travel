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

  interface MapImage {
    save(path: string): Promise<void>;
  }

  class StaticMaps {
    constructor(options: StaticMapsOptions);
    image: MapImage;
    addLine(options: LineOptions): void;
    addCircle(options: CircleOptions): void;
    render(center?: [number, number], zoom?: number): Promise<void>;
  }

  export default StaticMaps;
}
