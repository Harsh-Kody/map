export interface RobotLocation {
  lat?: number;
  lng?: number;
  speed?: number;
  boundary?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  x?:any
  y?:any
  fence?:any
  fenceIndex?:any
  fenceName?:any
  type?: any
  id?:any
  name?:any
  qx?:any
  qy?:any
  qz?:any
  timestamp?:any
  qw?:any
}