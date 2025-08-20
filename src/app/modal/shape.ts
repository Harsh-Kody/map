export interface Shape {
  mode: 'free' | 'circle' | 'square' | 'triangle';
  points?: { x: number; y: number }[]; // for free
  startX?: number; // for shapes
  startY?: number;
  endX?: number;
  endY?: number;
  radius?: any;
  name?: string;
}
