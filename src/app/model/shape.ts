export interface Shape {
  mode?: 'free' | 'circle' | 'square' | 'triangle' | null;
  points?: { x: number; y: number }[]; // for free
  startX?: number; // for shapes
  startY?: number;
  endX?: number;
  endY?: number;
  radius?: any;
  name?: string;
  canvasX?: number; // <-- add this
  canvasY?: number;
  isRobot?: any;
  vertices?: { x: number; y: number }[];
  isDraggable?: boolean;
  isResizable?: boolean;
  draggable?: any;
  resizable?: any;
  topX?: any;
  topY?: any;
  color?: any;
  isRestricted?: any;
}
