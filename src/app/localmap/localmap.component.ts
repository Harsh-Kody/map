import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Shape } from '../model/shape';
import { LocalmapService } from '../services/localmap.service';
import { map } from 'rxjs';
import { RobotLocation } from '../model/RobotLocation';
import { MapStorageService } from '../services/map-storage.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FenceModalComponent } from '../fence-modal/fence-modal.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-localmap',
  templateUrl: './localmap.component.html',
  styleUrls: ['./localmap.component.scss'],
})
export class LocalmapComponent implements AfterViewInit, OnInit {
  @ViewChild('mapImage') mapImage!: ElementRef<HTMLImageElement>;
  @ViewChild('mapCanvas') mapCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fenceModal') fenceModal!: TemplateRef<any>;
  mapForm!: FormGroup;

  isDuplicate: boolean = false;
  isSubmit: boolean = false;
  private ctx!: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dragStart = { x: 0, y: 0 };
  private readonly MAX_SCALE = 2;
  private nameChange: boolean = false;
  private isPanning = false;
  private originalPoints: { x: number; y: number }[] = [];
  private isDrawingShape = false;
  private fittedScale = 1;
  polygons: Shape[] = [];
  currentPolygon: { x: number; y: number }[] = [];
  shapeMode: 'free' | 'circle' | 'square' | 'triangle' = 'free';
  currentShape: Shape | null = null;
  circleRadius: number = 100;
  squareSize: number = 140;
  triangleBase: number = 200;
  triangleHeight: number = 140;
  private lastMouseDownPos = { x: 0, y: 0 };
  private dragDistance = 0;
  private resizingShape: Shape | null = null;
  private activeHandleIndex: number | null = null;
  private suppressClick = false;
  private readonly CLICK_DRAG_THRESHOLD = 5;
  private draggingShape: Shape | null = null;
  private dragOffset = { x: 0, y: 0 };
  robot: RobotLocation | null = null;
  private handleSize = 10;
  deleteMode: boolean = false;
  private hoveredShape: Shape | null = null;
  mapImageSrc: string | null = null;
  private readonly HANDLE_TOLERANCE = 20;
  restrictionPoints: { id: string; x: number; y: number }[] = [];
  showPath = false;
  robotPath: { x: number; y: number }[] = [];
  selectedFence: Shape | null = null;
  private clickedNonDraggableShape: boolean = false;
  isEditing: boolean = false;
  metaData: any = {};
  private readonly MAP_W = 24.1;
  private readonly MAP_H = 34.2;
  private readonly WORLD_SCALE = 25.71;
  coord: any;
  robots: any[] = [];
  lastFences: { [robotId: number]: string | null } = {};
  fenceLog: { robot: string; fenceName: string; time: Date }[] = [];
  robotList: any = [];
  localisationStatus: string = '';
  constructor(
    private localMapService: LocalmapService,
    private mapStorage: MapStorageService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private router: Router
  ) {}
  selectShape(mode: 'free' | 'circle' | 'square' | 'triangle') {
    this.shapeMode = mode;
    this.currentPolygon = [];
    this.isDrawingShape = false;
    this.currentShape = null;
  }

  async ngOnInit() {
    this.createMapForm();
    const blob = await this.mapStorage.getMap('mainMap');
    if (blob) {
      const objectURL = URL.createObjectURL(blob);
      this.mapImageSrc = objectURL;
    }
    this.localMapService.getRobotLocation().subscribe((robot) => {
      //    const idx = this.robots.findIndex((r) => r.id === robot.id);
      // if (idx >= 0) {
      //   this.robots[idx] = robot;
      // } else {
      //   this.robots.push(robot);
      // }

      // // ✅ Save path points if enabled
      this.quaternionToEuler(robot.qx, robot.qy, robot.qz, robot.qw);
      console.log('robot', robot.qx);
      if (this.showPath) {
        this.robotPath.push({ x: robot.x, y: robot.y });
      }
      const idx = this.robots.findIndex((r) => r.id === robot.id);
      if (idx >= 0) {
        this.robots[idx] = robot;
      } else {
        this.robots.push(robot);
      }
      console.log('rooo', this.robots);
      this.redraw();
    });
    this.localMapService.getMetaData().subscribe((meta) => {
      this.metaData = meta;
    });
    this.localMapService.getLocalisationStatus().subscribe((status) => {
      this.localisationStatus = status;
    });
  }

  createMapForm() {
    this.mapForm = this.formBuilder.group({
      fenceName: [null, [Validators.required, this.isDupliateNameValidator]],
      isDrag: [true],
      isResize: [true],
    });
  }

  ngAfterViewInit(): void {
    const img = this.mapImage.nativeElement;
    const canvas = this.mapCanvas.nativeElement;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    img.onload = () => {
      this.fitImageToCanvas();
      const saved = localStorage.getItem('geoFences');
      this.polygons = saved
        ? JSON.parse(saved).map((s: any) => ({
            ...s,
            isDraggable: s.isDraggable === true,
            isResizable: s.isResizable === true,
          }))
        : [];

      // this.carSocket.updateFences(this.polygons);
      this.redraw();
    };
    canvas.addEventListener('mousemove', (event) => {
      this.coord = this.getImageCoords(event);
      console.log(this.coord);
    });
    window.addEventListener('resize', () => {
      this.fitImageToCanvas();
      this.redraw();
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 2) {
        // Right button
        this.isPanning = true;
        this.dragStart = {
          x: event.clientX - this.offsetX,
          y: event.clientY - this.offsetY,
        };
        canvas.style.cursor = 'grabbing';
      }
    });

    // Mouse move → pan map if right button held
    canvas.addEventListener('mousemove', (event) => {
      if (this.isPanning) {
        this.offsetX = event.clientX - this.dragStart.x;
        this.offsetY = event.clientY - this.dragStart.y;
        this.redraw();
      }
    });

    window.addEventListener('mouseup', (event) => {
      if (event.button === 2 && this.isPanning) {
        this.isPanning = false;
        canvas.style.cursor = 'default';
      }
    });
    // window.addEventListener('mouseup', (event) => {
    //   if (isPanning) {
    //     isPanning = false;
    //     canvas.style.cursor = 'default';
    //   }
    // });

    // prevent context menu on right-click
  }
  private getImageCoords(event: MouseEvent) {
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    const img: HTMLImageElement = this.mapImage.nativeElement;

    // CSS px → image px
    const imagePxX = (cssX - this.offsetX) / this.scale;
    const imagePxY_topLeft = (cssY - this.offsetY) / this.scale;

    // pixels per map unit
    const imagePxPerMapX = img.naturalWidth / this.MAP_W;
    const imagePxPerMapY = img.naturalHeight / this.MAP_H;

    // image px → map coords
    const mapX = imagePxX / imagePxPerMapX;
    const mapY_fromBottom =
      (img.naturalHeight - imagePxY_topLeft) / imagePxPerMapY;

    // final result = map units (already scaled correctly)
    return { x: mapX, y: mapY_fromBottom };
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
  private toCanvasCoords(mapX: number, mapY: number) {
    const img: HTMLImageElement = this.mapImage.nativeElement;

    // 1) map units → image pixels
    const imagePxPerMapX = img.naturalWidth / this.MAP_W;
    const imagePxPerMapY = img.naturalHeight / this.MAP_H;

    const imagePxX = mapX * imagePxPerMapX;
    const imagePxY_fromBottom = mapY * imagePxPerMapY;
    const imagePxY_topLeft = img.naturalHeight - imagePxY_fromBottom;

    // 2) image pixels → canvas pixels (apply scale + pan offset)
    const canvasX = imagePxX * this.scale + this.offsetX;
    const canvasY = imagePxY_topLeft * this.scale + this.offsetY;

    return { x: canvasX, y: canvasY };
  }

  private fitImageToCanvas() {
    const img: HTMLImageElement = this.mapImage.nativeElement;
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const ctx = this.ctx!;
    const dpr = window.devicePixelRatio || 1;

    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;

    this.fittedScale = Math.min(
      maxWidth / img.naturalWidth,
      maxHeight / img.naturalHeight,
      1
    );
    this.scale = this.fittedScale;

    const cssWidth = img.naturalWidth * this.scale;
    const cssHeight = img.naturalHeight * this.scale;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    // ✅ Center image instead of top-left
    this.offsetX = (canvas.clientWidth - cssWidth) / 2;
    this.offsetY = (canvas.clientHeight - cssHeight) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.drawImage(img, this.offsetX, this.offsetY, cssWidth, cssHeight);
  }
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    event.preventDefault();
  }
  private quaternionToEuler(qx: number, qy: number, qz: number, qw: number) {
    // Yaw (Z-axis rotation)
    const yaw = Math.atan2(
      2.0 * (qw * qz + qx * qy),
      1.0 - 2.0 * (qy * qy + qz * qz)
    );

    // Pitch (Y-axis rotation)
    const pitch = Math.asin(2.0 * (qw * qy - qz * qx));

    // Roll (X-axis rotation)
    const roll = Math.atan2(
      2.0 * (qw * qx + qy * qz),
      1.0 - 2.0 * (qx * qx + qy * qy)
    );

    return {
      yaw: yaw * (180 / Math.PI), // degrees
      pitch: pitch * (180 / Math.PI),
      roll: roll * (180 / Math.PI),
    };
  }

  private drawCameraFOV(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    yaw: number,
    fovDeg: number,
    range: number
  ) {
    const fovRad = (fovDeg * Math.PI) / 180;
    const yawRad = (yaw * Math.PI) / 180;
    const visibleRange = range * this.scale;
    ctx.beginPath();
    ctx.moveTo(x, y);

    ctx.lineTo(
      x + visibleRange * Math.cos(yawRad - fovRad / 2),
      y + visibleRange * Math.sin(yawRad - fovRad / 2)
    );

    ctx.lineTo(
      x + visibleRange * Math.cos(yawRad + fovRad / 2),
      y + visibleRange * Math.sin(yawRad + fovRad / 2)
    );

    ctx.closePath();

    // Fill with transparent green
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fill();

    // Stroke with dark green border
    ctx.strokeStyle = 'darkgreen';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  private drawRobotPath() {
    if (!this.showPath || this.robotPath.length < 2) return;
    const ctx = this.ctx!;
    ctx.beginPath();

    // Move to first point
    const first = this.toCanvasCoords(this.robotPath[0].x, this.robotPath[0].y);
    ctx.moveTo(first.x, first.y);

    // Draw line through all path points
    for (let i = 1; i < this.robotPath.length; i++) {
      const pt = this.toCanvasCoords(this.robotPath[i].x, this.robotPath[i].y);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  private drawRobots() {
    if (!this.robots || this.robots.length === 0) return;
    const ctx = this.ctx!;
    // radius in CSS px (scale with zoom if you want)
    const baseRadius = 6; // CSS px at scale=1
    const radius = baseRadius; // optional scaling

    for (const r of this.robots) {
      // assume r.x,r.y are world units (SLAM). If r.x/r.y are map units or image px,
      // convert accordingly (but this implementation expects world units).
      const { x, y } = this.toCanvasCoords(r.x, r.y);
      // console.log('x', x, 'Y', y);
      ctx.beginPath();
      // console.log(x,"x");
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = r.fenceName ? 'orange' : 'red';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'black';
      ctx.fill();
      ctx.stroke();
      const { yaw } = this.quaternionToEuler(r.qx, r.qy, r.qz, r.qw);
      const canvasYaw = -yaw;
      // Adjust these depending on your camera
      const fovDeg = 120; // camera field of view
      const range = 100; // aura length in px (adjust for scaling)

      this.drawCameraFOV(ctx, x, y, canvasYaw, fovDeg, range);
      ctx.fillStyle = 'black';
      ctx.font = `${12 * Math.max(1, this.scale)}px Arial`;
      ctx.textAlign = 'center';
      // ctx.fillText(r.name, x, y - radius - 6);
    }
  }
  zoomIn() {
    this.zoomAtImageCenter(1.2);
  }

  zoomOut() {
    this.zoomAtImageCenter(1 / 1.2);
  }
  private zoomAtImageCenter(factor: number) {
    const oldScale = this.scale;
    const newScale = Math.min(
      Math.max(oldScale * factor, this.fittedScale),
      this.MAX_SCALE
    );
    if (newScale === oldScale) return;

    const canvas = this.mapCanvas.nativeElement;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;

    // convert canvas center point to image coordinates at old scale
    const imgX = (cx - this.offsetX) / oldScale;
    const imgY = (cy - this.offsetY) / oldScale;

    // adjust offsets so that image center stays fixed
    this.offsetX = cx - imgX * newScale;
    this.offsetY = cy - imgY * newScale;

    this.scale = newScale;
    this.redraw();
  }
  private redraw() {
    const img: HTMLImageElement = this.mapImage.nativeElement;
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const ctx = this.ctx!;
    const dpr = window.devicePixelRatio || 1;

    // CSS sizes
    const cssW = img.naturalWidth * this.scale;
    const cssH = img.naturalHeight * this.scale;

    // clear device buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // set transform so next drawing uses CSS px coords (1 user unit == 1 CSS px)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // draw image at CSS size
    ctx.drawImage(img, this.offsetX, this.offsetY, cssW, cssH);
    this.drawRobotPath();
    // draw overlays in CSS px coordinates
    // this.drawRobots();
    // this.drawRobots();
    // this.ctx.drawImage(this.mapImage.nativeElement, 0, 0);

    this.polygons.forEach((shape, i) => {
      if (this.isShapeInsideBoundary(shape)) {
        this.drawShape(shape, 'rgba(255,0,0,0.3)', 'red');
        if (shape.name) this.drawShapeLabel(shape);
      }
    });
    if (this.isDrawingShape && !this.draggingShape && !this.resizingShape) {
      if (this.shapeMode === 'free' && this.currentPolygon.length > 0) {
        const tempShape: Shape = { mode: 'free', points: this.currentPolygon };
        this.drawShape(tempShape, 'transparent', 'green');
      } else if (this.currentShape && !this.currentShape.name) {
        this.drawShape(this.currentShape, 'transparent', 'green');
      }
    }
    this.ctx.beginPath();
    this.ctx.lineWidth = 3 / this.scale;
    this.ctx.stroke();

    if (this.hoveredShape && this.hoveredShape.isResizable) {
      this.ctx.fillStyle = 'red';
      this.ctx.strokeStyle = 'black';

      if (this.hoveredShape.mode === 'circle' && this.hoveredShape.radius) {
        const handle = {
          x: this.hoveredShape.startX! + this.hoveredShape.radius,
          y: this.hoveredShape.startY!,
        };
        const scaledHandleSize = this.handleSize / this.scale;
        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, scaledHandleSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else if (
        this.hoveredShape.mode === 'square' ||
        this.hoveredShape.mode === 'triangle'
      ) {
        const corners = this.getShapeCorners(this.hoveredShape);
        const scaledHandleSize = this.handleSize / this.scale;
        for (let c of corners) {
          this.ctx.beginPath();
          this.ctx.rect(
            c.x - scaledHandleSize / 2,
            c.y - scaledHandleSize / 2,
            scaledHandleSize,
            scaledHandleSize
          );
          this.ctx.fill();
          this.ctx.stroke();
        }
      } else if (
        this.hoveredShape.mode === 'free' &&
        this.hoveredShape.points
      ) {
        for (let p of this.hoveredShape.points) {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, this.handleSize, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        }
      }

      this.ctx.restore();
    }

    if (this.showPath && this.robotPath.length > 1) {
      this.ctx.save();
      this.ctx.beginPath();
      const first = this.toCanvasCoords(
        this.robotPath[0].x,
        this.robotPath[0].y
      );
      this.ctx.moveTo(first.x, first.y);

      for (let i = 1; i < this.robotPath.length; i++) {
        const p = this.toCanvasCoords(this.robotPath[i].x, this.robotPath[i].y);
        this.ctx.lineTo(p.x, p.y);
      }

      this.ctx.strokeStyle = 'blue';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }
    this.restrictionPoints.forEach((p) => {
      const canvasPoint = this.toCanvasCoords(p.x, p.y);
      const size = 20;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(canvasPoint.x, canvasPoint.y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = 'rgba(255,0,0,0.3)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'red';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(canvasPoint.x - size / 1.5, canvasPoint.y - size / 1.5);
      this.ctx.lineTo(canvasPoint.x + size / 1.5, canvasPoint.y + size / 1.5);
      this.ctx.stroke();

      this.ctx.restore();
    });
    this.drawRobots();
  }

  onCanvasClick(event: MouseEvent) {
    if (event.button !== 0) return;
    if (event.target !== this.mapCanvas.nativeElement) return;

    const { x, y } = this.getTransformedCoords(event);
    if (this.deleteMode) {
      const { x, y } = this.getTransformedCoords(event);
      for (let i = this.polygons.length - 1; i >= 0; i--) {
        if (this.isPointInShape({ x, y }, this.polygons[i])) {
          if (confirm(`Delete fence "${this.polygons[i].name}"?`)) {
            this.polygons.splice(i, 1);
            localStorage.setItem('geoFences', JSON.stringify(this.polygons));
            // this.carSocket.updateFences(this.polygons);
            this.redraw();
          }
          break;
        }
      }
      this.deleteMode = false;
      this.mapCanvas.nativeElement.style.cursor = 'default';
      return;
    }
    if (this.shapeMode === 'free') {
      if (!this.isDrawingShape) {
        this.currentPolygon = [];
      }
      this.currentPolygon.push({ x, y });
      this.isDrawingShape = true;
      this.redraw();
      return;
    }
    this.currentShape = {
      mode: this.shapeMode,
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      isDraggable: this.mapForm.value.isDrag,
      isResizable: this.mapForm.value.isResize,
    };
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
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.beginPath();

    if (shape.mode === 'circle') {
      const r =
        shape.radius ??
        Math.sqrt(
          Math.pow((shape.endX ?? shape.startX)! - shape.startX!, 2) +
            Math.pow((shape.endY ?? shape.startY!) - shape.startY!, 2)
        );
      this.ctx.arc(shape.startX!, shape.startY!, r, 0, 2 * Math.PI);
      this.ctx.closePath();
    } else if (shape.mode === 'square') {
      this.ctx.rect(
        shape.startX!,
        shape.startY!,
        (shape.endX ?? shape.startX!) - shape.startX!,
        (shape.endY ?? shape.startY!) - shape.startY!
      );
    } else if (shape.mode === 'triangle') {
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      this.ctx.moveTo(shape.startX!, shape.startY!);
      this.ctx.lineTo(shape.endX!, shape.endY!);
      this.ctx.lineTo(midX, midY);
      this.ctx.closePath();
    } else if (shape.mode === 'free' && shape.points?.length) {
      this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      this.ctx.closePath();
    }
    const result = this.ctx.isPointInPath(point.x, point.y);
    this.ctx.restore();
    return result;
  }
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;

    const { x, y } = this.getTransformedCoords(event);
    this.currentPolygon.push({ x, y });
    if (!this.isInsideBoundary(x, y)) {
      alert('Click outside boundary');
      return;
    }

    if (this.hoveredShape) {
      if (this.hoveredShape.isResizable) {
        if (this.hoveredShape.mode === 'circle' && this.hoveredShape.radius) {
          const handle = {
            x: this.hoveredShape.startX! + this.hoveredShape.radius,
            y: this.hoveredShape.startY!,
          };
          if (Math.hypot(x - handle.x, y - handle.y) < this.HANDLE_TOLERANCE) {
            this.resizingShape = this.hoveredShape;
            this.activeHandleIndex = 0;
            return;
          }
        } else if (
          this.hoveredShape.mode === 'square' ||
          this.hoveredShape.mode === 'triangle'
        ) {
          const corners = this.getShapeCorners(this.hoveredShape);
          for (let i = 0; i < corners.length; i++) {
            if (
              Math.abs(x - corners[i].x) < this.HANDLE_TOLERANCE &&
              Math.abs(y - corners[i].y) < this.HANDLE_TOLERANCE
            ) {
              this.resizingShape = this.hoveredShape;
              this.activeHandleIndex = i;
              return;
            }
          }
        } else if (
          this.hoveredShape.mode === 'free' &&
          this.hoveredShape.points
        ) {
          for (let i = 0; i < this.hoveredShape.points.length; i++) {
            const p = this.hoveredShape.points[i];
            if (Math.hypot(x - p.x, y - p.y) < this.HANDLE_TOLERANCE) {
              this.resizingShape = this.hoveredShape;
              this.activeHandleIndex = i;
              this.originalPoints = this.hoveredShape.points.map((pt) => ({
                ...pt,
              }));
              return;
            }
          }
        }
      }
    }

    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        if (!this.polygons[i].isDraggable) {
          this.clickedNonDraggableShape = true;
          this.currentShape = null;
          this.isDrawingShape = false;
          return;
        }
        this.draggingShape = this.polygons[i];
        this.dragOffset = { x, y };
        if (this.draggingShape.mode === 'free' && this.draggingShape.points)
          this.originalPoints = this.draggingShape.points.map((p) => ({
            ...p,
          }));
        else
          this.originalPoints = [
            { x: this.draggingShape.startX!, y: this.draggingShape.startY! },
            { x: this.draggingShape.endX!, y: this.draggingShape.endY! },
          ];
        return;
      }
    }

    this.lastMouseDownPos = { x: event.clientX, y: event.clientY };
    this.dragDistance = 0;
    this.suppressClick = false;

    if (event.button === 2) {
      this.isPanning = true;
      this.dragStart = {
        x: event.clientX - this.offsetX,
        y: event.clientY - this.offsetY,
      };
      return;
    }
    if (event.button !== 0) return;

    if (this.shapeMode === 'circle') {
      this.currentShape = { mode: 'circle', startX: x, startY: y };
      this.isDrawingShape = true;
    } else if (this.shapeMode === 'square') {
      this.currentShape = {
        mode: 'square',
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        isDraggable: this.mapForm.value.isDrag,
        isResizable: this.mapForm.value.isResize,
      };
      this.isDrawingShape = true;
    } else if (this.shapeMode === 'triangle') {
      this.currentShape = {
        mode: 'triangle',
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        isDraggable: this.mapForm.value.isDrag,
        isResizable: this.mapForm.value.isResize,
      };
      this.isDrawingShape = true;
    } else {
    }
  }

  private restoreOriginalShape(shape: Shape) {
    if (!shape) return;

    if (shape.mode === 'free' && shape.points) {
      shape.points = this.originalPoints.map((p) => ({ ...p }));
    } else if (shape.mode === 'circle') {
      const orig = this.originalPoints[0];
      shape.startX = orig.x;
      shape.startY = orig.y;
      shape.radius = this.originalPoints[1]?.x ?? this.circleRadius;
    } else if (shape.mode === 'square' || shape.mode === 'triangle') {
      shape.startX = this.originalPoints[0].x;
      shape.startY = this.originalPoints[0].y;
      shape.endX = this.originalPoints[1].x;
      shape.endY = this.originalPoints[1].y;
    }
  }
  private isNearHandle(
    shape: Shape,
    x: number,
    y: number
  ): { kind: 'ew' | 'nwse'; index?: number } | null {
    if (!shape) return null;
    const tol = 15;

    if (shape.mode === 'circle' && shape.radius) {
      const handle = { x: shape.startX! + shape.radius, y: shape.startY! };
      if (Math.hypot(x - handle.x, y - handle.y) < tol)
        return { kind: 'ew', index: 0 };
    } else if (shape.mode === 'square' || shape.mode === 'triangle') {
      const corners = this.getShapeCorners(shape);
      for (let i = 0; i < corners.length; i++) {
        const c = corners[i];
        if (Math.abs(x - c.x) < tol && Math.abs(y - c.y) < tol) {
          return { kind: 'nwse', index: i };
        }
      }
    } else if (shape.mode === 'free' && shape.points) {
      for (let i = 0; i < shape.points.length; i++) {
        const p = shape.points[i];
        if (Math.hypot(x - p.x, y - p.y) < tol)
          return { kind: 'nwse', index: i };
      }
    }

    return null;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;
    const { x, y } = this.getTransformedCoords(event);

    let foundHover = false;
    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        this.hoveredShape = this.polygons[i];
        foundHover = true;
        break;
      }
    }
    if (!foundHover) this.hoveredShape = null;
    this.redraw();
    if (this.isPanning) {
      this.offsetX = event.clientX - this.dragStart.x;
      this.offsetY = event.clientY - this.dragStart.y;
      this.redraw();
      return;
    }
    if (this.hoveredShape) {
      const near = this.isNearHandle(this.hoveredShape, x, y);
      if (near) {
        if (near.kind === 'ew') {
          this.mapCanvas.nativeElement.style.cursor = 'ew-resize';
        } else {
          this.mapCanvas.nativeElement.style.cursor = 'nwse-resize';
        }
      } else if (this.hoveredShape.isDraggable === true) {
        this.mapCanvas.nativeElement.style.cursor = 'move';
      } else {
        this.mapCanvas.nativeElement.style.cursor = 'default';
      }
    } else {
      this.mapCanvas.nativeElement.style.cursor = 'default';
    }
    if (this.resizingShape && this.activeHandleIndex !== null) {
      const proposedShape: Shape = JSON.parse(
        JSON.stringify(this.resizingShape)
      );

      if (proposedShape.mode === 'circle') {
        const dx = x - proposedShape.startX!;
        const dy = y - proposedShape.startY!;
        proposedShape.radius = Math.hypot(dx, dy);
      } else if (proposedShape.mode === 'square') {
        switch (this.activeHandleIndex) {
          case 0:
            proposedShape.startX = x;
            proposedShape.startY = y;
            break;
          case 1:
            proposedShape.endX = x;
            proposedShape.startY = y;
            break;
          case 2:
            proposedShape.endX = x;
            proposedShape.endY = y;
            break;
          case 3:
            proposedShape.startX = x;
            proposedShape.endY = y;
            break;
        }
      } else if (proposedShape.mode === 'triangle') {
        switch (this.activeHandleIndex) {
          case 0:
            proposedShape.startX = x;
            proposedShape.startY = y;
            break;
          case 1:
            proposedShape.endX = x;
            proposedShape.endY = y;
            break;
          case 2:
            const topX = proposedShape.startX!;
            proposedShape.endX = topX - (x - topX);
            proposedShape.endY = y;
            break;
        }
      } else if (proposedShape.mode === 'free' && proposedShape.points) {
        proposedShape.points[this.activeHandleIndex] = { x, y };
      }

      const idx = this.polygons.indexOf(this.resizingShape);
      if (
        this.isShapeInsideBoundary(proposedShape) &&
        !this.doesShapeOverlap(proposedShape, idx)
      ) {
        Object.assign(this.resizingShape, proposedShape);
      }
      this.redraw();
      return;
    }
    if (this.draggingShape) {
      const dx = x - this.dragOffset.x;
      const dy = y - this.dragOffset.y;

      if (this.draggingShape.mode === 'free' && this.draggingShape.points) {
        this.draggingShape.points = this.originalPoints.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));
      } else {
        const width =
          (this.draggingShape.endX ?? this.draggingShape.startX!) -
          this.draggingShape.startX!;
        const height =
          (this.draggingShape.endY ?? this.draggingShape.startY!) -
          this.draggingShape.startY!;

        this.draggingShape.startX = this.originalPoints[0].x + dx;
        this.draggingShape.startY = this.originalPoints[0].y + dy;
        this.draggingShape.endX = this.draggingShape.startX + width;
        this.draggingShape.endY = this.draggingShape.startY + height;
      }

      if (this.clickedNonDraggableShape) {
        this.currentShape = null;
        this.draggingShape = null;
        this.resizingShape = null;
        this.activeHandleIndex = null;
      }
      this.redraw();
    }

    if (this.isDrawingShape && this.currentShape && this.shapeMode !== 'free') {
      this.currentShape.endX = x;
      this.currentShape.endY = y;
      this.redraw();
    }
  }
  originalCoordinates() {
    if (this.draggingShape) {
      if (this.draggingShape.mode === 'free' && this.draggingShape.points) {
        this.draggingShape.points = this.originalPoints.map((p) => ({
          ...p,
        }));
      } else {
        this.draggingShape.startX = this.originalPoints[0].x;
        this.draggingShape.startY = this.originalPoints[0].y;
        this.draggingShape.endX = this.originalPoints[1].x;
        this.draggingShape.endY = this.originalPoints[1].y;
      }
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;
    this.suppressClick = this.dragDistance > this.CLICK_DRAG_THRESHOLD;
    this.isPanning = false;
    if (this.clickedNonDraggableShape) {
      this.clickedNonDraggableShape = false;
      this.draggingShape = null;
      this.resizingShape = null;
      this.currentShape = null;
      this.redraw();
      return;
    }
    if (
      this.clickedNonDraggableShape &&
      this.dragDistance <= this.CLICK_DRAG_THRESHOLD
    ) {
      this.clickedNonDraggableShape = false;
      return;
    }
    if (this.resizingShape) {
      const idx = this.polygons.indexOf(this.resizingShape);
      if (
        !this.isShapeInsideBoundary(this.resizingShape) ||
        this.doesShapeOverlap(this.resizingShape, idx)
      ) {
        alert('Invalid resize: outside boundary or overlaps!');
        this.restoreOriginalShape(this.resizingShape);
        if (this.resizingShape.mode === 'free' && this.originalPoints.length) {
          this.resizingShape.points = this.originalPoints.map((p) => ({
            ...p,
          }));
        } else {
          this.originalCoordinates();
        }
      } else {
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        // this.carSocket.updateFences(this.polygons);
      }
      this.currentPolygon = [];
      this.currentShape = null;
      this.resizingShape = null;
      this.activeHandleIndex = null;
      this.originalPoints = [];
      this.isDrawingShape = false;
      this.mapCanvas.nativeElement.style.cursor = 'default';
      this.clickedNonDraggableShape = false;
      this.redraw();
      return;
    }

    if (this.draggingShape) {
      const idx = this.polygons.indexOf(this.draggingShape);
      if (!this.isShapeInsideBoundary(this.draggingShape)) {
        this.originalCoordinates();
        alert('Invalid move: shape outside boundry');
      } else if (this.doesShapeOverlap(this.draggingShape, idx)) {
        // revert back
        this.originalCoordinates();
        alert('Invalid move: shape overlaps another!');
      } else {
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        // this.carSocket.updateFences(this.polygons);
      }
      this.isDrawingShape = false;
      this.currentPolygon = [];
      this.draggingShape = null;
      this.clickedNonDraggableShape = false;
      this.redraw();
      return;
    }

    if (!this.isDrawingShape || !this.currentShape) return;
    if (this.currentShape.mode === 'circle') {
      const dx =
        (this.currentShape.endX ?? this.currentShape.startX!) -
        this.currentShape.startX!;
      const dy =
        (this.currentShape.endY ?? this.currentShape.startY!) -
        this.currentShape.startY!;
      this.currentShape.radius = Math.hypot(dx, dy);
      if (!dx && !dy) {
        this.currentShape.radius = this.circleRadius;
        this.currentShape.endX = this.currentShape.startX! + this.circleRadius;
        this.currentShape.endY = this.currentShape.startY!;
      }
    } else if (
      this.currentShape.mode === 'square' &&
      this.currentShape.startX === this.currentShape.endX &&
      this.currentShape.startY === this.currentShape.endY
    ) {
      this.currentShape.endX = this.currentShape.startX! + this.squareSize;
      this.currentShape.endY = this.currentShape.startY! + this.squareSize;
    } else if (
      this.currentShape.mode === 'triangle' &&
      this.currentShape.startX === this.currentShape.endX &&
      this.currentShape.startY === this.currentShape.endY
    ) {
      this.currentShape.endX = this.currentShape.startX! + this.triangleBase;
      this.currentShape.endY = this.currentShape.startY! + this.triangleHeight;
    }

    if (
      this.isShapeInsideBoundary(this.currentShape) &&
      !this.doesShapeOverlap(this.currentShape)
    ) {
      this.finishShape(this.currentShape);
      // let userName: any = prompt('Enter name for this shape:', `My Fence`);
      // if (!userName || userName.trim() === '') {
      //   this.currentShape = null;
      //   this.currentPolygon = [];
      //   this.isDrawingShape = false;
      //   this.redraw();
      //   return;
      // }
      // while (this.isDuplicateName(userName)) {
      //   userName =
      //     prompt('Name exists, enter another:', userName) ||
      //     `Fence-${Date.now()}`;
      // }
      // this.currentShape.name = userName.trim();
      // this.polygons.push({ ...this.currentShape });
      // localStorage.setItem('geoFences', JSON.stringify(this.polygons));
      // this.carSocket.updateFences(this.polygons);
    } else {
      alert('Invalid shape: outside boundary or overlaps!');
    }
    this.currentPolygon = [];
    this.currentShape = null;
    this.isDrawingShape = false;
    this.redraw();
    this.clickedNonDraggableShape = false;
  }

  // renameShape(index: number) {
  //   this.nameChange = false;
  //   const shape = this.polygons[index];
  //   const newName = prompt('Enter new name:', shape.name || '');
  //   if (!this.isDuplicateName(newName)) {
  //     if (newName && newName.trim() !== '') {
  //       shape.name = newName.trim();
  //       localStorage.setItem('geoFences', JSON.stringify(this.polygons));
  //       this.carSocket.updateFences(this.polygons);
  //       this.redraw();
  //     }
  //   } else {
  //     alert('Name already exist');
  //   }
  // }
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent) {
    const { x, y } = this.getTransformedCoords(event);
    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        this.nameChange = true;
        this.editFenceByIndex(i);
        return;
      }
    }

    if (this.shapeMode === 'free' && this.currentPolygon.length > 2) {
      const shape: Shape = { mode: 'free', points: [...this.currentPolygon] };

      if (!this.isShapeInsideBoundary(shape)) {
        alert('Polygon is outside allowed boundary!');
        this.currentPolygon = [];
        this.isDrawingShape = false;
        this.redraw();
        return;
      }
      if (this.doesShapeOverlap(shape)) {
        alert('Invalid polygon: overlaps with existing shape!');
        this.currentPolygon = [];
        this.isDrawingShape = false;
        this.redraw();
        return;
      }

      this.finishShape(shape);
      // let userName = prompt('Enter name for this shape:', 'My Fence');
      // if (!userName || userName.trim() === '') {
      //   this.currentShape = null;
      //   this.currentPolygon = [];
      //   this.isDrawingShape = false;
      //   this.redraw();
      //   return;
      // }
      // if (this.isDuplicateName(userName.trim())) {
      //   alert(
      //     'A shape with this name already exists. Please choose another name.'
      //   );
      //   return;
      // }

      // shape.name = userName.trim();
      // this.polygons.push(shape);
      // localStorage.setItem('geoFences', JSON.stringify(this.polygons));
      // this.carSocket.updateFences(this.polygons);
      // this.currentPolygon = [];
      this.isDrawingShape = false;
      // this.currentShape = null;
      this.redraw();
    }
  }
  finishShape(newShape: Shape) {
    this.isEditing = false;
    this.mapForm.reset({
      fenceName: '',
      isDrag: true,
      isResize: true,
    });

    const modalRef = this.modalService.open(this.fenceModal, {
      backdrop: 'static',
    });

    modalRef.result
      .then(() => {
        const fenceName = this.mapForm.controls['fenceName'].value;
        const isDrag = this.mapForm.controls['isDrag'].value;
        const isResize = this.mapForm.controls['isResize'].value;

        if (this.isDuplicateName(fenceName)) {
          return;
        }
        newShape.name = fenceName;
        newShape.isDraggable = isDrag;
        newShape.isResizable = isResize;
        this.polygons.push(newShape);
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        // this.carSocket.updateFences(this.polygons);
        this.redraw();
      })
      .catch(() => {});
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
    } else if (shape.mode === 'square') {
      const corners = [
        { x: shape.startX!, y: shape.startY! },
        { x: shape.endX!, y: shape.startY! },
        { x: shape.endX!, y: shape.endY! },
        { x: shape.startX!, y: shape.endY! },
      ];
      return corners.every((c) => this.isInsideBoundary(c.x, c.y));
    } else if (shape.mode === 'triangle') {
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      const vertices = [
        { x: shape.startX!, y: shape.startY! },
        { x: shape.endX!, y: shape.endY! },
        { x: midX, y: midY },
      ];
      return vertices.every((v) => this.isInsideBoundary(v.x, v.y));
    }
    return false;
  }
  public isDuplicateName(
    name: string | null,
    ignoreShape?: Shape | null
  ): boolean {
    if (!name) return false;
    const lower = name.toLowerCase();
    const found = this.polygons.some(
      (shape) => shape !== ignoreShape && shape.name?.toLowerCase() === lower
    );
    this.isDuplicate = found;
    if (found) {
      this.isSubmit = true;
    }
    return found;
  }

  isDupliateNameValidator = (control: any) => {
    if (!control.value) return null;
    const valLower = control.value.toLowerCase();
    const isDuplicate = this.polygons.some(
      (shape) =>
        shape !== this.selectedFence && shape.name?.toLowerCase() === valLower
    );
    return isDuplicate ? { duplicateName: true } : null;
  };

  toggleDeleteMode() {
    if (this.polygons.length !== 0) {
      this.deleteMode = !this.deleteMode;
    }
  }
  togglePath() {
    this.showPath = !this.showPath;
    if (!this.showPath) {
      this.robotPath = [];
      this.redraw();
    }
  }

  private doesShapeOverlap(
    newShape: Shape,
    ignoreIndex: number | null = null
  ): boolean {
    const samplePoints: { x: number; y: number }[] = [];
    if (newShape.mode === 'circle' && newShape.radius) {
      const r = newShape.radius;
      const step = 5;

      for (let dx = -r; dx <= r; dx += step) {
        for (let dy = -r; dy <= r; dy += step) {
          if (dx * dx + dy * dy <= r * r) {
            samplePoints.push({
              x: newShape.startX! + dx,
              y: newShape.startY! + dy,
            });
          }
        }
      }

      const angleStep = Math.PI / 36;
      for (let angle = 0; angle < 2 * Math.PI; angle += angleStep) {
        samplePoints.push({
          x: newShape.startX! + r * Math.cos(angle),
          y: newShape.startY! + r * Math.sin(angle),
        });
      }
    } else if (newShape.mode === 'square' && newShape.endX && newShape.endY) {
      const minX = Math.min(newShape.startX!, newShape.endX);
      const maxX = Math.max(newShape.startX!, newShape.endX);
      const minY = Math.min(newShape.startY!, newShape.endY);
      const maxY = Math.max(newShape.startY!, newShape.endY);
      const step = 10;
      for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
          samplePoints.push({ x, y });
        }
      }
    } else if (newShape.mode === 'triangle' && newShape.endX && newShape.endY) {
      const midX = newShape.startX! * 2 - newShape.endX!;
      const midY = newShape.endY!;

      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(newShape.startX!, newShape.startY!);
      this.ctx.lineTo(newShape.endX!, newShape.endY!);
      this.ctx.lineTo(midX, midY);
      this.ctx.closePath();

      const minX = Math.min(newShape.startX!, newShape.endX!, midX);
      const maxX = Math.max(newShape.startX!, newShape.endX!, midX);
      const minY = Math.min(newShape.startY!, newShape.endY!, midY);
      const maxY = Math.max(newShape.startY!, newShape.endY!, midY);
      const step = 10;

      for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
          if (this.ctx.isPointInPath(x, y)) {
            samplePoints.push({ x, y });
          }
        }
      }
      this.ctx.restore();
    } else if (newShape.mode === 'free' && newShape.points) {
      const minX = Math.min(...newShape.points.map((p) => p.x));
      const maxX = Math.max(...newShape.points.map((p) => p.x));
      const minY = Math.min(...newShape.points.map((p) => p.y));
      const maxY = Math.max(...newShape.points.map((p) => p.y));

      const step = 10;
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(newShape.points[0].x, newShape.points[0].y);
      for (let j = 1; j < newShape.points.length; j++) {
        this.ctx.lineTo(newShape.points[j].x, newShape.points[j].y);
      }
      this.ctx.closePath();

      for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
          if (this.ctx.isPointInPath(x, y)) {
            samplePoints.push({ x, y });
          }
        }
      }
      this.ctx.restore();
    }
    for (let i = 0; i < this.polygons.length; i++) {
      if (ignoreIndex !== null && i === ignoreIndex) continue;
      const existing = this.polygons[i];
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.beginPath();

      if (existing.mode === 'circle' && existing.radius) {
        this.ctx.arc(
          existing.startX!,
          existing.startY!,
          existing.radius,
          0,
          Math.PI * 2
        );
      } else if (existing.mode === 'square' && existing.endX && existing.endY) {
        this.ctx.rect(
          existing.startX!,
          existing.startY!,
          existing.endX - existing.startX!,
          existing.endY - existing.startY!
        );
      } else if (
        existing.mode === 'triangle' &&
        existing.endX &&
        existing.endY
      ) {
        const midX = existing.startX! * 2 - existing.endX!;
        const midY = existing.endY!;
        this.ctx.moveTo(existing.startX!, existing.startY!);
        this.ctx.lineTo(existing.endX!, existing.endY!);
        this.ctx.lineTo(midX, midY);
        this.ctx.closePath();
      } else if (existing.mode === 'free' && existing.points) {
        this.ctx.moveTo(existing.points[0].x, existing.points[0].y);
        for (let j = 1; j < existing.points.length; j++) {
          this.ctx.lineTo(existing.points[j].x, existing.points[j].y);
        }
        this.ctx.closePath();
      }

      if (samplePoints.some((p) => this.ctx.isPointInPath(p.x, p.y))) {
        this.ctx.restore();
        return true;
      }
      this.ctx.restore();
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
  editFenceByIndex(index: number) {
    if (index < 0 || index >= this.polygons.length) return;

    this.isEditing = true;
    this.clickedNonDraggableShape = false;
    this.selectedFence = this.polygons[index];

    this.currentShape = null;
    this.isDrawingShape = false;
    this.resizingShape = null;
    this.activeHandleIndex = null;
    this.draggingShape = null;
    this.originalPoints = [];
    this.hoveredShape = null;
    try {
      this.mapCanvas.nativeElement.style.cursor = 'default';
    } catch (e) {}

    this.mapForm.patchValue({
      fenceName: this.selectedFence.name || '',
      isDrag: this.selectedFence.isDraggable || false,
      isResize: this.selectedFence.isResizable || false,
    });

    const modalRef = this.modalService.open(this.fenceModal, {
      backdrop: 'static',
    });

    modalRef.result
      .then(() => {
        const fenceName = this.mapForm.controls['fenceName'].value;
        const isDrag = this.mapForm.controls['isDrag'].value;
        const isResize = this.mapForm.controls['isResize'].value;

        if (this.isDuplicateName(fenceName, this.selectedFence)) {
          return;
        }

        this.selectedFence!.name = fenceName;
        this.selectedFence!.isDraggable = isDrag;
        this.selectedFence!.isResizable = isResize;

        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        // this.carSocket.updateFences(this.polygons);

        this.resetEditState();
        this.redraw();
      })
      .catch(() => {
        this.resetEditState();
      });
  }

  private resetEditState() {
    this.selectedFence = null;
    this.clickedNonDraggableShape = false;
    this.draggingShape = null;
    this.resizingShape = null;
    this.activeHandleIndex = null;
    this.hoveredShape = null;
    this.originalPoints = [];
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

  private getShapeCorners(shape: Shape): { x: number; y: number }[] {
    if (shape.mode === 'square') {
      return [
        { x: shape.startX!, y: shape.startY! },
        { x: shape.endX!, y: shape.startY! },
        { x: shape.endX!, y: shape.endY! },
        { x: shape.startX!, y: shape.endY! },
      ];
    } else if (shape.mode === 'triangle') {
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      return [
        { x: shape.startX!, y: shape.startY! },
        { x: shape.endX!, y: shape.endY! },
        { x: midX, y: midY },
      ];
    }
    return [];
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
      this.ctx.beginPath();

      this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      if (shape.name) {
        this.ctx.closePath();
      }
    }
    this.ctx.fillStyle = fillStyle;
    this.ctx.fill();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = 2 / this.scale;
    this.ctx.stroke();
  }

  hasError(ControlName: string, Errorname: string) {
    return this.mapForm.get(ControlName)?.hasError(Errorname);
  }
  onSubmit(modal: any) {
    if (this.mapForm.valid && !this.isDuplicate) {
      modal.close();
    } else {
      console.log('Not valid');
    }
  }
  resetForm() {
    this.isSubmit = false;
    this.mapForm.reset();
  }

  async deleteMap() {
    localStorage.removeItem('geoFences');
    this.polygons = [];
    // this.carSocket.updateFences([]);
    await this.mapStorage.deleteMap('mainMap');
    this.router.navigate(['/upload-map']);
  }
}
