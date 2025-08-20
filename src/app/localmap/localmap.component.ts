import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Shape } from '../modal/shape';
import { LocalmapService } from '../services/localmap.service';

@Component({
  selector: 'app-localmap',
  templateUrl: './localmap.component.html',
  styleUrls: ['./localmap.component.scss'],
})
export class LocalmapComponent implements AfterViewInit, OnInit {
  @ViewChild('mapImage') mapImage!: ElementRef<HTMLImageElement>;
  @ViewChild('mapCanvas') mapCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dragStart = { x: 0, y: 0 };
  private readonly MAX_SCALE = 1;
  private nameChange: boolean = false;
  private isPanning = false;
  private isDraggingShape = false;
  private isDrawingShape = false;
  private fittedScale = 1;
  polygons: Shape[] = [];
  currentPolygon: { x: number; y: number }[] = [];
  shapeMode: 'free' | 'circle' | 'square' | 'triangle' = 'free';
  currentShape: Shape | null = null;
  circleRadius: number = 50;
  squareSize: number = 80;
  triangleBase: number = 100;
  triangleHeight: number = 80;
  private selectedShapeIndex: number | null = null;
  private dragOffset = { x: 0, y: 0 };
  private lastMouseDownPos = { x: 0, y: 0 };
  private dragDistance = 0;
  private suppressClick = false;
  private readonly CLICK_DRAG_THRESHOLD = 5;
  private activeHandle: string | null = null;
private HANDLE_SIZE = 8;
  constructor(private carSocket: LocalmapService) {}
  selectShape(mode: 'free' | 'circle' | 'square' | 'triangle') {
    this.shapeMode = mode;
  }

  ngOnInit(): void {
    // this.carSocket.getCarLocation().subscribe((coords) => {
    //   console.log("Car location from server" , coords);
    // })
  }

  private isShapeInsideBoundary(shape: Shape): boolean {
    if (shape.mode === 'free' && shape.points) {
      return shape.points.every((p) => this.isInsideBoundary(p.x, p.y));
    } else if (shape.mode === 'circle') {
      const r =
        shape.radius ??
        Math.sqrt(
          Math.pow((shape.endX ?? shape.startX)! - shape.startX!, 2) +
            Math.pow((shape.endY ?? shape.startY)! - shape.startY!, 2)
        );
      return (
        this.isInsideBoundary(shape.startX! - r, shape.startY! - r) &&
        this.isInsideBoundary(shape.startX! + r, shape.startY! + r)
      );
    } else if (shape.mode === 'square' || shape.mode === 'triangle') {
      const corners = [
        { x: shape.startX!, y: shape.startY! },
        { x: shape.endX!, y: shape.startY! },
        { x: shape.endX!, y: shape.endY! },
        { x: shape.startX!, y: shape.endY! },
      ];
      return corners.every((c) => this.isInsideBoundary(c.x, c.y));
    }
    return false;
  }

  private doesShapeOverlap(
    newShape: Shape,
    ignoreIndex: number | null = null
  ): boolean {
    for (let i = 0; i < this.polygons.length; i++) {
      if (ignoreIndex !== null && i === ignoreIndex) continue;
      const existingShape = this.polygons[i];

      // Use canvas hit test
      this.ctx.save();
      this.ctx.setTransform(
        this.scale,
        0,
        0,
        this.scale,
        this.offsetX,
        this.offsetY
      );
      this.ctx.beginPath();
      this.drawShape(existingShape, 'transparent', 'transparent');

      let overlap = false;

      if (newShape.mode === 'free' && newShape.points) {
        overlap = newShape.points.some((p) => this.ctx.isPointInPath(p.x, p.y));
      } else if (newShape.mode === 'circle') {
        const r = newShape.radius ?? 40;
        overlap = this.ctx.isPointInPath(newShape.startX!, newShape.startY!);
        if (!overlap) {
          overlap =
            this.ctx.isPointInPath(newShape.startX! - r, newShape.startY!) ||
            this.ctx.isPointInPath(newShape.startX! + r, newShape.startY!) ||
            this.ctx.isPointInPath(newShape.startX!, newShape.startY! - r) ||
            this.ctx.isPointInPath(newShape.startX!, newShape.startY! + r);
        }
      } else {
        // test center point
        const cx = (newShape.startX! + (newShape.endX ?? newShape.startX!)) / 2;
        const cy = (newShape.startY! + (newShape.endY ?? newShape.startY!)) / 2;
        overlap = this.ctx.isPointInPath(cx, cy);
      }

      this.ctx.restore();
      if (overlap) return true;
    }
    return false;
  }

  private isInsideBoundary(x: number, y: number): boolean {
    return (
      x >= 73.88825541619121 &&
      x <= 5069.783352337514 &&
      y >= 144.65222348916728 &&
      y <= 3551.7673888255417
    );
  }
  ngAfterViewInit(): void {
    const img = this.mapImage.nativeElement;
    const canvas = this.mapCanvas.nativeElement;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    img.onload = () => {
      this.fitImageToCanvas();
      const saved = localStorage.getItem('geoFences');
      this.polygons = saved ? JSON.parse(saved) : [];

      this.redraw();
    };
    window.addEventListener('resize', () => {
      this.fitImageToCanvas();
      this.redraw();
    });
  }
  private toCanvasCoords(x: number, y: number) {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY,
    };
  }
  private fitImageToCanvas() {
    const img = this.mapImage.nativeElement;
    const canvas = this.mapCanvas.nativeElement;
    const container = canvas.parentElement as HTMLElement;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';

    const scaleX = canvas.width / dpr / img.naturalWidth;
    const scaleY = canvas.height / dpr / img.naturalHeight;
    this.fittedScale = Math.min(scaleX, scaleY);
    this.scale = this.fittedScale;
    this.offsetX = (canvas.width - img.naturalWidth * this.scale) / 2;
    this.offsetY = (canvas.height - img.naturalHeight * this.scale) / 2;
  }

  onCanvasClick(event: MouseEvent) {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const { x, y } = this.getTransformedCoords(event);

    if (!this.isInsideBoundary(x, y)) {
      console.warn('Click outside boundary');
      return;
    }

    if (this.shapeMode === 'free') {
      this.currentPolygon.push({ x, y });
      this.redraw();
    }

    // ❌ Remove shape pushing from here
    // Just initialize the shape for dragging/drawing
    if (this.shapeMode === 'circle') {
      this.currentShape = {
        mode: 'circle',
        startX: x,
        startY: y,
        radius: this.circleRadius,
      };
    } else if (this.shapeMode === 'square') {
      this.currentShape = {
        mode: 'square',
        startX: x,
        startY: y,
        endX: x + this.squareSize,
        endY: y + this.squareSize,
      };
    } else if (this.shapeMode === 'triangle') {
      this.currentShape = {
        mode: 'triangle',
        startX: x,
        startY: y,
        endX: x + this.triangleBase,
        endY: y + this.triangleHeight,
      };
    }
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = 1.1;
    if (event.deltaY < 0) {
      this.scale = Math.min(this.scale * zoomFactor, this.MAX_SCALE);
    } else {
      this.scale = Math.max(this.scale / zoomFactor, this.fittedScale);
    }
    this.redraw();
  }
  private isPointInShape(
    point: { x: number; y: number },
    shape: Shape
  ): boolean {
    const { x, y } = this.toCanvasCoords(point.x, point.y);

    this.ctx.save();
    this.ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.offsetX,
      this.offsetY
    );
    this.ctx.beginPath();
    this.drawShape(shape, 'transparent', 'transparent');
    const result = this.ctx.isPointInPath(x, y);
    this.ctx.restore();

    return result;
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.lastMouseDownPos = { x: event.clientX, y: event.clientY };
    this.dragDistance = 0;
    this.suppressClick = false;
    const { x, y } = this.getTransformedCoords(event);
    if (event.button === 2) {
      this.isPanning = true;
      this.dragStart = {
        x: event.clientX - this.offsetX,
        y: event.clientY - this.offsetY,
      };
      return;
    }

      for (let i = this.polygons.length - 1; i >= 0; i--) {
        if (this.isPointInShape({ x, y }, this.polygons[i])) {
          this.isDraggingShape = true;
          this.selectedShapeIndex = i;
          this.dragOffset = { x, y };
          return;
        }
      
    }

    // 🟢 Start drawing shape
    this.isDrawingShape = true;
    this.currentShape = { mode: this.shapeMode, startX: x, startY: y };
    // if (this.shapeMode === 'free') {
    //   this.currentPolygon = [];
    //   this.currentPolygon.push({ x, y });
    // } else {
    //   this.currentShape = { mode: this.shapeMode, startX: x, startY: y };
    // }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const dxFromDown = event.clientX - this.lastMouseDownPos.x;
    const dyFromDown = event.clientY - this.lastMouseDownPos.y;
    this.dragDistance = Math.hypot(dxFromDown, dyFromDown);
    const { x, y } = this.getTransformedCoords(event);

    if (this.isDraggingShape && this.selectedShapeIndex !== null) {
      const shape = this.polygons[this.selectedShapeIndex];
      const dx = x - this.dragOffset.x;
      const dy = y - this.dragOffset.y;
      this.moveShape(shape, dx, dy);
      this.dragOffset = { x, y };
      this.redraw();
      return;
    }

    if (this.isPanning) {
      this.offsetX = event.clientX - this.dragStart.x;
      this.offsetY = event.clientY - this.dragStart.y;
      this.redraw();
      return;
    }

    if (this.isDrawingShape && this.currentShape && this.shapeMode !== 'free') {
      this.currentShape.endX = x;
      this.currentShape.endY = y;
      this.redraw();
    }
    // if (this.isDrawingShape && this.shapeMode === 'free') {
    //   this.currentPolygon.push({ x, y });
    //   this.redraw();
    //   return;
    // }
  }
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
  }
  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.suppressClick = this.dragDistance > this.CLICK_DRAG_THRESHOLD;

    if (this.isDraggingShape) {
      localStorage.setItem('geoFences', JSON.stringify(this.polygons));
    }

    if (this.isDrawingShape && this.currentShape) {
      if (this.shapeMode !== 'free') {
        if (this.dragDistance <= this.CLICK_DRAG_THRESHOLD) {
          if (this.shapeMode === 'circle') {
            this.currentShape.radius = this.circleRadius;
          } else if (this.shapeMode === 'square') {
            this.currentShape.endX =
              this.currentShape.startX! + this.squareSize;
            this.currentShape.endY =
              this.currentShape.startY! + this.squareSize;
          } else if (this.shapeMode === 'triangle') {
            this.currentShape.endX =
              this.currentShape.startX! + this.triangleBase;
            this.currentShape.endY =
              this.currentShape.startY! + this.triangleHeight;
          }
        }

        if (
          this.isShapeInsideBoundary(this.currentShape) &&
          !this.doesShapeOverlap(this.currentShape)
        ) {
          this.nameChange = true;
          const userName = prompt('Enter name for this shape:', 'My Fence');
          if (userName) {
            this.currentShape.name = userName;
          } else {
            this.currentShape.name = `Fence-${Date.now()}`; // fallback unique name
          }
          this.nameChange = false;
          this.polygons.push({ ...this.currentShape });
          localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        } else {
          console.warn('Shape outside boundary or overlaps, not saved!');
        }
      }
      this.currentShape = null;
    }

    this.isPanning = false;
    this.isDraggingShape = false;
    this.isDrawingShape = false;
    this.selectedShapeIndex = null;
    this.redraw();
  }
  renameShape(index: number) {
    this.nameChange = false;
    const shape = this.polygons[index];
    const newName = prompt('Enter new name:', shape.name || '');
    if (newName && newName.trim() !== '') {
      shape.name = newName.trim();
      localStorage.setItem('geoFences', JSON.stringify(this.polygons));
      this.redraw();
    }
  }
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent) {
    const { x, y } = this.getTransformedCoords(event);

    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        this.nameChange = true;
        this.renameShape(i);
        return;
      }
    }

    if (this.shapeMode === 'free' && this.currentPolygon.length > 2) {
      const shape: Shape = { mode: 'free', points: [...this.currentPolygon] };

      if (this.isShapeInsideBoundary(shape) && !this.doesShapeOverlap(shape)) {
        const userName = prompt('Enter name for this shape:', 'My Fence');
        shape.name =
          userName && userName.trim() !== ''
            ? userName.trim()
            : `Fence-${Date.now()}`;
        this.polygons.push(shape);
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        // return;
      } else {
        alert('Polygon is outside allowed boundary!');
      }

      this.currentPolygon = [];
      this.redraw();
    }
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.2, this.MAX_SCALE);
    this.redraw();
  }

  zoomOut() {
    this.scale = Math.max(this.scale / 1.2, this.fittedScale);
    this.redraw();
  }

  resetView() {
    this.fitImageToCanvas();
    this.redraw();
  }

  clearGeofences() {
    this.polygons = [];
    this.currentPolygon = [];
    localStorage.removeItem('geoFences');
    this.redraw();
  }
  private getTransformedCoords(event: MouseEvent) {
    const rect = this.mapCanvas.nativeElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasX = (event.clientX - rect.left) * dpr;
    const canvasY = (event.clientY - rect.top) * dpr;
    const x = (canvasX - this.offsetX) / this.scale;
    const y = (canvasY - this.offsetY) / this.scale;
    return { x, y };
  }
  private moveShape(shape: Shape, dx: number, dy: number) {
    const movedShape: Shape = JSON.parse(JSON.stringify(shape));

    if (movedShape.mode === 'free' && movedShape.points) {
      movedShape.points = movedShape.points.map((p) => ({
        x: p.x + dx,
        y: p.y + dy,
      }));
    } else {
      movedShape.startX! += dx;
      movedShape.startY! += dy;
      if (movedShape.endX !== undefined) movedShape.endX += dx;
      if (movedShape.endY !== undefined) movedShape.endY += dy;
    }

    if (
      this.isShapeInsideBoundary(movedShape) &&
      !this.doesShapeOverlap(movedShape, this.selectedShapeIndex)
    ) {
      Object.assign(shape, movedShape);
    }
  }
  private redraw() {
    const canvas = this.mapCanvas.nativeElement;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.offsetX,
      this.offsetY
    );
    this.ctx.imageSmoothingEnabled = this.scale <= 1;

    this.ctx.drawImage(this.mapImage.nativeElement, 0, 0);

    this.polygons.forEach((shape) => {
      if (this.isShapeInsideBoundary(shape)) {
        this.drawShape(shape, 'rgba(255,0,0,0.3)', 'red');
        if (shape.name) this.drawShapeLabel(shape);
      }
    });
    if (this.shapeMode === 'free' && this.currentPolygon.length) {
      if (this.nameChange) {
        return;
      } else {
        const tempShape: Shape = { mode: 'free', points: this.currentPolygon };
        this.drawShape(tempShape, 'transparent', 'green');
      }
    } else if (
      this.currentShape &&
      this.isShapeInsideBoundary(this.currentShape)
    ) {
      // this.drawShape(this.currentShape, 'rgba(0,255,0,0.3)', 'green');
    }

    this.ctx.beginPath();
    this.ctx.lineWidth = 3 / this.scale;
    this.ctx.stroke();
  }
  private drawShapeLabel(shape: Shape) {
    let x = 0,
      y = 0;

    if (shape.mode === 'circle') {
      x = shape.startX!;
      y = shape.startY!;
    } else if (shape.mode === 'square' || shape.mode === 'triangle') {
      x = (shape.startX! + (shape.endX ?? shape.startX!)) / 2;
      y = (shape.startY! + (shape.endY ?? shape.startY!)) / 2;
    } else if (shape.mode === 'free' && shape.points) {
      // centroid for polygon
      const sum = shape.points.reduce(
        (acc, p) => {
          acc.x += p.x;
          acc.y += p.y;
          return acc;
        },
        { x: 0, y: 0 }
      );
      x = sum.x / shape.points.length;
      y = sum.y / shape.points.length;
    }

    this.ctx.fillStyle = 'black';
    this.ctx.font = `${14 / this.scale}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(shape.name!, x, y);
  }
  private drawShape(shape: Shape, fillStyle: string, strokeStyle: string) {
    this.ctx.beginPath();
    if (shape.mode === 'circle') {
      let radius: number;
      if (shape.radius !== undefined) {
        radius = shape.radius;
      } else {
        radius = Math.sqrt(
          Math.pow((shape.endX ?? shape.startX)! - shape.startX!, 2) +
            Math.pow((shape.endY ?? shape.startY)! - shape.startY!, 2)
        );
      }
      this.ctx.arc(shape.startX!, shape.startY!, radius, 0, 2 * Math.PI);
    } else if (shape.mode === 'square') {
      this.ctx.rect(
        shape.startX!,
        shape.startY!,
        shape.endX! - shape.startX!,
        shape.endY! - shape.startY!
      );
    } else if (shape.mode === 'triangle') {
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      this.ctx.moveTo(shape.startX!, shape.startY!);
      this.ctx.lineTo(shape.endX!, shape.endY!);
      this.ctx.lineTo(midX, midY);
      this.ctx.closePath();
    } else if (shape.mode === 'free' && shape.points) {
      this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++)
        this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
      // this.ctx.closePath();
    }
    this.ctx.fillStyle = fillStyle;
    this.ctx.fill();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = 2 / this.scale;
    this.ctx.stroke();
  }
}
