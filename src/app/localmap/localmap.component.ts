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
  @ViewChild('geofenceToolModal') geofenceToolModal!: TemplateRef<any>;
  mapForm!: FormGroup;
  editingShape: Shape | null = null;
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
  shapeMode: 'free' | 'circle' | 'square' | 'triangle' | null = null;
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
  private handleSize = 5;
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
  pendingTool: any = null;
  constructor(
    private localMapService: LocalmapService,
    private mapStorage: MapStorageService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private router: Router
  ) {}
  addingGeofence: boolean = false;
  selectedColor: string = '#ff0000'; // default
  colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
  // startAddGeofence() {
  //   this.addingGeofence = true;
  //   this.currentPolygon = [];
  //   this.currentShape = null;
  // }

  // cancelGeofence() {
  //   this.addingGeofence = false;
  //   this.currentPolygon = [];
  //   this.currentShape = null;
  // }

  // selectColor(color: string) {
  //   this.selectedColor = color;
  // }

  // confirmGeofence() {
  //   if (this.currentShape) {
  //     this.currentShape.color = this.selectedColor;
  //     this.polygons.push(this.currentShape);
  //     this.currentShape = null;
  //   } else if (this.currentPolygon.length > 0) {
  //     this.polygons.push({
  //       mode: 'free',
  //       points: [...this.currentPolygon],
  //       color: this.selectedColor, // <-- attach selected color
  //     });
  //     this.currentPolygon = [];
  //   }
  //   this.addingGeofence = false;
  //   this.redraw();
  // }
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
      shapeMode: ['circle', Validators.required],
      circleRadius: [3, Validators.required],
      squareSize: [2 , Validators.required ],
      triangleBase: [2, Validators.required],
      triangleHeight: [1, Validators.required],
      color: ['#ff0000', Validators.required],
      isDrag: [true],
      isResize: [true],
    });
  }
  startAddGeofence() {
    this.editingShape = null; // new mode
    this.mapForm.reset({
      fenceName: null,
      shapeMode: 'circle',
      circleRadius: 3,
      squareSize: 2,
      triangleBase: 2,
      triangleHeight: 1,
      color: '#ff0000',
      isDrag: true,
      isResize: true,
    });
    this.modalService.open(this.geofenceToolModal, { backdrop: 'static' });
  }
  renameGeofence(shape: Shape) {
    this.editingShape = shape;
    this.mapForm.patchValue({
      fenceName: shape.name,
      color: shape.color,
      isDrag: shape.isDraggable,
      isResize: shape.isResizable,
    });
    this.modalService.open(this.fenceModal, { backdrop: 'static' });
  }
  onToolSubmit(modal: any) {
    if (this.mapForm.valid) {
      
      if (this.editingShape) {
        // update existing
        this.editingShape.name = this.mapForm.value.fenceName;
        this.editingShape.color = this.mapForm.value.color;
        this.editingShape.isDraggable = this.mapForm.value.isDrag;
        this.editingShape.isResizable = this.mapForm.value.isResize;
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
      } else {
        // store new tool
        this.pendingTool = this.mapForm.value;
      }
      modal.close();
    }else{

    }
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
      console.log('X', this.coord.x, 'Y', this.coord.y);
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
    return { x: mapX, y: mapY_fromBottom }; // SAME system as toCanvasCoords input
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

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;
    const { x, y } = this.getTransformedCoords(event);
    const mouseCanvas = this.toCanvasCoords(x, y);
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
      const near = this.isNearHandle(this.hoveredShape, mouseCanvas);
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
      const { x, y } = this.getTransformedCoords(event);
      const proposedShape: Shape = JSON.parse(
        JSON.stringify(this.resizingShape)
      );

      if (proposedShape.mode === 'circle') {
        const dx = x - proposedShape.startX!;
        const dy = y - proposedShape.startY!;
        proposedShape.radius = Math.hypot(dx, dy);
        proposedShape.endX = x;
        proposedShape.endY = y;
      } else if (proposedShape.mode === 'square') {
        switch (this.activeHandleIndex) {
          case 0: // top-left
            proposedShape.startX = x;
            proposedShape.startY = y;
            proposedShape.endX = this.originalPoints[1].x;
            proposedShape.endY = this.originalPoints[1].y;
            break;
          case 1: // top-right
            proposedShape.endX = x;
            proposedShape.startY = y;
            proposedShape.startX = this.originalPoints[0].x;
            proposedShape.endY = this.originalPoints[1].y;
            break;
          case 2: // bottom-right
            proposedShape.endX = x;
            proposedShape.endY = y;
            proposedShape.startX = this.originalPoints[0].x;
            proposedShape.startY = this.originalPoints[0].y;
            break;
          case 3: // bottom-left
            proposedShape.startX = x;
            proposedShape.endY = y;
            proposedShape.endX = this.originalPoints[1].x;
            proposedShape.startY = this.originalPoints[0].y;
            break;
        }
      } else if (proposedShape.mode === 'triangle') {
        switch (this.activeHandleIndex) {
          case 0: // bottom-left
            proposedShape.startX = x;
            proposedShape.startY = y;
            proposedShape.endX = this.originalPoints[1].x;
            proposedShape.endY = this.originalPoints[1].y;
            proposedShape.topX = this.originalPoints[2].x;
            proposedShape.topY = this.originalPoints[2].y;
            break;
          case 1: // bottom-right
            proposedShape.endX = x;
            proposedShape.endY = y;
            proposedShape.startX = this.originalPoints[0].x;
            proposedShape.startY = this.originalPoints[0].y;
            proposedShape.topX = this.originalPoints[2].x;
            proposedShape.topY = this.originalPoints[2].y;
            break;
          case 2: // top
            proposedShape.topX = x;
            proposedShape.topY = y;
            proposedShape.startX = this.originalPoints[0].x;
            proposedShape.startY = this.originalPoints[0].y;
            proposedShape.endX = this.originalPoints[1].x;
            proposedShape.endY = this.originalPoints[1].y;
            break;
        }
      } else if (proposedShape.mode === 'free' && proposedShape.points) {
        proposedShape.points[this.activeHandleIndex] = { x, y };
      }

      const idx = this.polygons.indexOf(this.resizingShape);
      if (!this.doesShapeOverlap(proposedShape, idx)) {
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
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;

    const { x, y } = this.getTransformedCoords(event);
    // store last down for drag-distance checks
    this.lastMouseDownPos = { x: event.clientX, y: event.clientY };
    this.dragDistance = 0;
    this.suppressClick = false;

    // RIGHT CLICK: keep your existing behaviour for right-button panning if you want
    if (event.button === 2) {
      this.isPanning = true;
      this.dragStart = {
        x: event.clientX - this.offsetX,
        y: event.clientY - this.offsetY,
      };
      return;
    }

    // ONLY respond to left-button from here on
    if (event.button !== 0) return;

    // --- FIRST: check hovered / handles / existing shapes (hit-testing) ---
    // Recompute hoveredShape (optional if already set via mousemove)
    let foundHover = false;
    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        this.hoveredShape = this.polygons[i];
        foundHover = true;
        break;
      }
    }
    if (!foundHover) this.hoveredShape = null;

    // If there's a hovered shape, prioritize resizing / dragging that shape
    if (this.hoveredShape) {
      // check handle for circle resize
      if (this.hoveredShape.isResizable) {
        if (this.hoveredShape.mode === 'circle' && this.hoveredShape.radius) {
          const center = this.toCanvasCoords(
            this.hoveredShape.startX!,
            this.hoveredShape.startY!
          );
          const edge = this.toCanvasCoords(
            this.hoveredShape.endX!,
            this.hoveredShape.endY!
          );
          const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
          const handle = { x: center.x + radius, y: center.y };
          const mouseCanvas = this.toCanvasCoords(x, y);
          if (
            Math.hypot(mouseCanvas.x - handle.x, mouseCanvas.y - handle.y) <
            this.HANDLE_TOLERANCE
          ) {
            this.resizingShape = this.hoveredShape;
            this.activeHandleIndex = 0;
            this.originalPoints = [
              { x: this.hoveredShape.startX!, y: this.hoveredShape.startY! },
              { x: this.hoveredShape.endX!, y: this.hoveredShape.endY! },
            ];
            return;
          }
        } else if (
          this.hoveredShape.mode === 'square' ||
          this.hoveredShape.mode === 'triangle'
        ) {
          const cornersWorld = this.getShapeCorners(this.hoveredShape);
          const mouseCanvas = this.toCanvasCoords(x, y);
          for (let i = 0; i < cornersWorld.length; i++) {
            const cCanvas = this.toCanvasCoords(
              cornersWorld[i].x,
              cornersWorld[i].y
            );
            if (
              Math.hypot(mouseCanvas.x - cCanvas.x, mouseCanvas.y - cCanvas.y) <
              this.HANDLE_TOLERANCE
            ) {
              this.resizingShape = this.hoveredShape;
              this.activeHandleIndex = i;
              this.originalPoints = cornersWorld.map((pt) => ({ ...pt }));
              return;
            }
          }
        } else if (
          this.hoveredShape.mode === 'free' &&
          this.hoveredShape.points
        ) {
          const mouseCanvas = this.toCanvasCoords(x, y);
          for (let i = 0; i < this.hoveredShape.points.length; i++) {
            const pCanvas = this.toCanvasCoords(
              this.hoveredShape.points[i].x,
              this.hoveredShape.points[i].y
            );
            if (
              Math.hypot(mouseCanvas.x - pCanvas.x, mouseCanvas.y - pCanvas.y) <
              this.HANDLE_TOLERANCE
            ) {
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

      // If clicked inside hovered shape and it's draggable — start dragging
      if (this.isPointInShape({ x, y }, this.hoveredShape)) {
        if (!this.hoveredShape.isDraggable) {
          this.clickedNonDraggableShape = true;
          this.currentShape = null;
          this.isDrawingShape = false;
          return;
        }
        this.draggingShape = this.hoveredShape;
        this.dragOffset = { x, y };
        if (this.draggingShape.mode === 'free' && this.draggingShape.points) {
          this.originalPoints = this.draggingShape.points.map((p) => ({
            ...p,
          }));
        } else {
          this.originalPoints = [
            { x: this.draggingShape.startX!, y: this.draggingShape.startY! },
            { x: this.draggingShape.endX!, y: this.draggingShape.endY! },
          ];
        }
        return;
      }
    }

    // --- If we reached here, click did NOT hit any shape/handle -- start panning OR start drawing depending on tool ---

    // If no tool selected (shapeMode is null) and no pendingTool, left-click should pan
    if (!this.pendingTool && !this.shapeMode) {
      this.isPanning = true;
      this.dragStart = {
        x: event.clientX - this.offsetX,
        y: event.clientY - this.offsetY,
      };
      return;
    }

    // If pendingTool exists, or a shapeMode is active, handle drawing behaviour:
    // Free mode: start free poly (only if shapeMode === 'free' or pendingTool requests free)
    if (
      this.shapeMode === 'free' ||
      (this.pendingTool && this.pendingTool.shapeMode === 'free')
    ) {
      if (!this.isDrawingShape) this.currentPolygon = [];
      this.currentPolygon.push({ x, y });
      this.isDrawingShape = true;
      this.redraw();
      return;
    }

    // Otherwise for fixed shapes: prepare currentShape for drawing (mouseup will finalize)
    if (this.shapeMode || this.pendingTool) {
      const mode = this.pendingTool
        ? this.pendingTool.shapeMode
        : this.shapeMode!;
      this.currentShape = {
        mode,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        isDraggable: this.mapForm.value.isDrag,
        isResizable: this.mapForm.value.isResize,
      } as Shape;
      this.isDrawingShape = true;
      return;
    }

    // fallback: nothing to do
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

    this.polygons.forEach((shape) => {
      const strokeColor = shape.color || 'red';
      const fillColor = shape.color
        ? this.hexToRgba(shape.color, 0.3)
        : 'rgba(255,0,0,0.3)';
      this.drawShape(shape, fillColor, strokeColor);
      if (shape.name) this.drawShapeLabel(shape);
    });
    if (this.isDrawingShape && !this.draggingShape && !this.resizingShape) {
      if (this.shapeMode === 'free' && this.currentPolygon.length > 0) {
        const tempShape: Shape = {
          mode: 'free',
          points: this.currentPolygon,
          color: this.selectedColor, // <-- attach selected color
        };
        this.drawShape(
          tempShape,
          this.hexToRgba(this.selectedColor, 0.3),
          this.selectedColor
        );
      } else if (this.currentShape && !this.currentShape.name) {
        this.currentShape.color = this.selectedColor; // <-- attach selected color
        this.drawShape(
          this.currentShape,
          this.hexToRgba(this.selectedColor, 0.3),
          this.selectedColor
        );
      }
    }
    this.ctx.beginPath();
    // ctx.lineWidth = 2 / dpr;
    this.ctx.stroke();

    if (this.hoveredShape && this.hoveredShape.isResizable) {
      this.ctx.fillStyle = 'red';
      this.ctx.strokeStyle = 'black';
      const scaledHandleSize = this.handleSize;
      if (this.hoveredShape.mode === 'circle' && this.hoveredShape.radius) {
        const center = this.toCanvasCoords(
          this.hoveredShape.startX!,
          this.hoveredShape.startY!
        );
        const edge = this.toCanvasCoords(
          this.hoveredShape.endX!,
          this.hoveredShape.endY!
        );
        const radius = Math.hypot(edge.x - center.x, edge.y - center.y);

        const handle = { x: center.x + radius, y: center.y };

        this.ctx.beginPath();
        this.ctx.arc(handle.x, handle.y, scaledHandleSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else if (
        this.hoveredShape.mode === 'square' ||
        this.hoveredShape.mode === 'triangle'
      ) {
        const corners = this.getShapeCorners(this.hoveredShape);

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
        const canvasPoints = this.hoveredShape.points.map((p) =>
          this.toCanvasCoords(p.x, p.y)
        );
        for (let p of canvasPoints) {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, scaledHandleSize / 2, 0, Math.PI * 2);
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
      // this.ctx.strokeStyle = 'red';
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
  private hexToRgba(hex: string, alpha: number): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
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
    const oldScale = this.scale;

    let newScale: number;
    if (event.deltaY < 0) {
      newScale = Math.min(oldScale * zoomFactor, this.MAX_SCALE);
    } else {
      newScale = Math.max(oldScale / zoomFactor, this.fittedScale);
    }
    if (newScale === oldScale) return;

    const canvas = this.mapCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Get mouse position relative to canvas
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;

    // Convert canvas point to image coordinates at old scale
    const imgX = (cx - this.offsetX) / oldScale;
    const imgY = (cy - this.offsetY) / oldScale;

    // Adjust offsets so that the zoom keeps mouse position fixed
    this.offsetX = cx - imgX * newScale;
    this.offsetY = cy - imgY * newScale;

    this.scale = newScale;
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
      const center = this.toCanvasCoords(shape.startX!, shape.startY!);
      const edge = this.toCanvasCoords(shape.endX!, shape.endY!);
      const r = Math.hypot(edge.x - center.x, edge.y - center.y);
      this.ctx.arc(center.x, center.y, r, 0, 2 * Math.PI);
    } else if (shape.mode === 'square') {
      const topLeft = this.toCanvasCoords(shape.startX!, shape.startY!);
      const bottomRight = this.toCanvasCoords(shape.endX!, shape.endY!);
      this.ctx.rect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );
    } else if (shape.mode === 'triangle') {
      const p1 = this.toCanvasCoords(shape.startX!, shape.startY!);
      const p2 = this.toCanvasCoords(shape.endX!, shape.endY!);
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      const p3 = this.toCanvasCoords(midX, midY);

      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.closePath();
    } else if (shape.mode === 'free' && shape.points?.length) {
      const first = this.toCanvasCoords(shape.points[0].x, shape.points[0].y);
      this.ctx.moveTo(first.x, first.y);
      for (let i = 1; i < shape.points.length; i++) {
        const p = this.toCanvasCoords(shape.points[i].x, shape.points[i].y);
        this.ctx.lineTo(p.x, p.y);
      }
      this.ctx.closePath();
    }

    const canvasPt = this.toCanvasCoords(point.x, point.y);
    const result = this.ctx.isPointInPath(canvasPt.x, canvasPt.y);
    this.ctx.restore();
    return result;
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
  isNearHandle(shape: Shape | null, mouseCanvas: { x: number; y: number }) {
    if (!shape) return null;
    const tol = 10 * this.scale; // tolerance adjusted for zoom

    if (shape.mode === 'circle' && shape.radius) {
      const center = this.toCanvasCoords(shape.startX!, shape.startY!);
      const edge = this.toCanvasCoords(shape.endX!, shape.endY!);
      const radius = Math.hypot(edge.x - center.x, edge.y - center.y);

      // Handle is on right side of circle
      const handle = { x: center.x + radius, y: center.y };

      if (
        Math.hypot(mouseCanvas.x - handle.x, mouseCanvas.y - handle.y) < tol
      ) {
        return { kind: 'ew', index: 0 };
      }
    } else if (shape.mode === 'square' || shape.mode === 'triangle') {
      // Squares and triangles: use transformed corners
      const corners = this.getShapeCorners(shape);
      for (let i = 0; i < corners.length; i++) {
        const c = corners[i];
        if (
          Math.abs(mouseCanvas.x - c.x) < tol &&
          Math.abs(mouseCanvas.y - c.y) < tol
        ) {
          return { kind: 'nwse', index: i };
        }
      }
    } else if (shape.mode === 'free' && shape.points) {
      const canvasPoints = shape.points.map((p) =>
        this.toCanvasCoords(p.x, p.y)
      );
      for (let i = 0; i < canvasPoints.length; i++) {
        const p = canvasPoints[i];
        if (Math.hypot(mouseCanvas.x - p.x, mouseCanvas.y - p.y) < tol) {
          return { kind: 'nwse', index: i };
        }
      }
    }

    return null;
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
    const { x, y } = this.getTransformedCoords(event);

    // ✅ Handle modal-created tools (pendingTool)
    if (this.pendingTool) {
      const tool = this.pendingTool;
      let newShape: Shape | null = null;

      if (tool.shapeMode === 'circle') {
        newShape = {
          mode: 'circle',
          startX: x,
          startY: y,
          endX: x + tool.circleRadius,
          endY: y,
          radius: tool.circleRadius,
          color: tool.color,
          isDraggable: tool.isDrag,
          isResizable: tool.isResize,
          name: tool.fenceName,
        };
      } else if (tool.shapeMode === 'square') {
        newShape = {
          mode: 'square',
          startX: x,
          startY: y,
          endX: x + tool.squareSize,
          endY: y + tool.squareSize,
          color: tool.color,
          isDraggable: tool.isDrag,
          isResizable: tool.isResize,
          name: tool.fenceName,
        };
      } else if (tool.shapeMode === 'triangle') {
        newShape = {
          mode: 'triangle',
          startX: x,
          startY: y,
          endX: x + tool.triangleBase,
          endY: y + tool.triangleHeight,
          color: tool.color,
          isDraggable: tool.isDrag,
          isResizable: tool.isResize,
          name: tool.fenceName,
        };
      } else if (tool.shapeMode === 'free') {
        this.shapeMode = 'free';
        this.currentPolygon = [{ x, y }];
        this.isDrawingShape = true;
        this.redraw();
        this.pendingTool = null;
        return;
      }
if (newShape) {
  // 🔴 Duplicate check
  if (this.isDuplicateName(newShape.name)) {
    alert('Fence name must be unique!');
    return;
  }

  if (!this.doesShapeOverlap(newShape)) {
    this.polygons.push(newShape);
    localStorage.setItem('geoFences', JSON.stringify(this.polygons));
    this.redraw();
  } else {
    alert('Invalid shape: overlaps another!');
  }
}
      // if (newShape && !this.doesShapeOverlap(newShape)) {
      //   this.polygons.push(newShape);
      //   localStorage.setItem('geoFences', JSON.stringify(this.polygons));
      //   this.redraw();
      // } else if (newShape) {
      //   alert('Invalid shape: overlaps another!');
      // }

      this.pendingTool = null;
      return;
    }

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
      {
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
      if (this.doesShapeOverlap(this.draggingShape, idx)) {
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

    if (!this.doesShapeOverlap(this.currentShape)) {
      this.finishShape(this.currentShape);
    } else {
      alert('Invalid shape: outside boundary or overlaps!');
    }
    this.currentPolygon = [];
    this.currentShape = null;
    this.isDrawingShape = false;
    this.redraw();
    this.clickedNonDraggableShape = false;
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent) {
    const { x, y } = this.getTransformedCoords(event);

    // ✅ Case 1: Edit existing fence on dblclick inside shape
    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        this.nameChange = true;
        this.editFenceByIndex(i);
        return;
      }
    }

    // ✅ Case 2: Finalize free polygon
    if (
      this.shapeMode === 'free' &&
      this.isDrawingShape &&
      this.currentPolygon.length > 2
    ) {
      const fenceName = this.mapForm.controls['fenceName'].value;
      const isDrag = this.mapForm.controls['isDrag'].value;
      const isResize = this.mapForm.controls['isResize'].value;
      const color = this.mapForm.controls['color'].value;

      if (!fenceName) {
        alert('Please enter a name for the fence.');
        return;
      }

      const newShape: Shape = {
        mode: 'free',
        points: [...this.currentPolygon],
        name: fenceName,
        isDraggable: isDrag,
        isResizable: isResize,
        color: color,
      };

      if (this.doesShapeOverlap(newShape)) {
        alert('Invalid polygon: overlaps with existing shape!');
        this.currentPolygon = [];
        this.isDrawingShape = false;
        this.redraw();
        return;
      }

      this.polygons.push(newShape);
      localStorage.setItem('geoFences', JSON.stringify(this.polygons));

      this.currentPolygon = [];
      this.shapeMode = null
      this.isDrawingShape = false;
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

  public isDuplicateName(
    name?: string | null,
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

    // --- 1. Generate sample points for new shape ---
    if (newShape.mode === 'circle' && newShape.radius) {
      const r = newShape.radius;
      const step = 3;
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
    } else if (newShape.mode === 'square' && newShape.endX && newShape.endY) {
      const minX = Math.min(newShape.startX!, newShape.endX);
      const maxX = Math.max(newShape.startX!, newShape.endX);
      const minY = Math.min(newShape.startY!, newShape.endY);
      const maxY = Math.max(newShape.startY!, newShape.endY);
      const step = 5; // finer resolution
      for (let x = minX; x <= maxX; x += step) {
        for (let y = minY; y <= maxY; y += step) {
          samplePoints.push({ x, y });
        }
      }
    } else if (newShape.mode === 'triangle' && newShape.endX && newShape.endY) {
      const p1 = { x: newShape.startX!, y: newShape.startY! };
      const p2 = { x: newShape.endX!, y: newShape.endY! };
      const p3 = { x: 2 * p1.x - p2.x, y: p2.y };

      // Bounding box
      const minX = Math.min(p1.x, p2.x, p3.x);
      const maxX = Math.max(p1.x, p2.x, p3.x);
      const minY = Math.min(p1.y, p2.y, p3.y);
      const maxY = Math.max(p1.y, p2.y, p3.y);

      const step = 5;
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.closePath();

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

      const step = 5;
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

    // --- 2. Check against all existing shapes ---
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
        const x = Math.min(existing.startX!, existing.endX!);
        const y = Math.min(existing.startY!, existing.endY!);
        const w = Math.abs(existing.endX! - existing.startX!);
        const h = Math.abs(existing.endY! - existing.startY!);
        this.ctx.rect(x, y, w, h);
      } else if (
        existing.mode === 'triangle' &&
        existing.endX &&
        existing.endY
      ) {
        const p1 = { x: existing.startX!, y: existing.startY! };
        const p2 = { x: existing.endX!, y: existing.endY! };
        const p3 = { x: 2 * p1.x - p2.x, y: p2.y };
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.lineTo(p3.x, p3.y);
        this.ctx.closePath();
      } else if (existing.mode === 'free' && existing.points) {
        this.ctx.moveTo(existing.points[0].x, existing.points[0].y);
        for (let j = 1; j < existing.points.length; j++) {
          this.ctx.lineTo(existing.points[j].x, existing.points[j].y);
        }
        this.ctx.closePath();
      }

      // 🔑 Actual overlap test
      if (samplePoints.some((p) => this.ctx.isPointInPath(p.x, p.y))) {
        this.ctx.restore();
        return true;
      }
      this.ctx.restore();
    }
    return false;
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

    const modalRef = this.modalService.open(this.geofenceToolModal, {
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
      const topLeft = this.toCanvasCoords(shape.startX!, shape.startY!);
      const topRight = this.toCanvasCoords(shape.endX!, shape.startY!);
      const bottomRight = this.toCanvasCoords(shape.endX!, shape.endY!);
      const bottomLeft = this.toCanvasCoords(shape.startX!, shape.endY!);
      return [topLeft, topRight, bottomRight, bottomLeft];
    } else if (shape.mode === 'triangle') {
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      const p1 = this.toCanvasCoords(shape.startX!, shape.startY!);
      const p2 = this.toCanvasCoords(shape.endX!, shape.endY!);
      const p3 = this.toCanvasCoords(midX, midY);
      return [p1, p2, p3];
    }

    return [];
  }

  private drawShapeLabel(shape: Shape) {
    let x = 0,
      y = 0;

    if (shape.mode === 'circle') {
      const center = this.toCanvasCoords(shape.startX!, shape.startY!);
      x = center.x;
      y = center.y;
    } else if (shape.mode === 'square' || shape.mode === 'triangle') {
      const p1 = this.toCanvasCoords(shape.startX!, shape.startY!);
      const p2 = this.toCanvasCoords(
        shape.endX ?? shape.startX!,
        shape.endY ?? shape.startY!
      );
      x = (p1.x + p2.x) / 2;
      y = (p1.y + p2.y) / 2;
    } else if (shape.mode === 'free' && shape.points) {
      const canvasPoints = shape.points.map((p) =>
        this.toCanvasCoords(p.x, p.y)
      );
      const sum = canvasPoints.reduce(
        (acc, p) => {
          acc.x += p.x;
          acc.y += p.y;
          return acc;
        },
        { x: 0, y: 0 }
      );
      x = sum.x / canvasPoints.length;
      y = sum.y / canvasPoints.length;
    }

    this.ctx.fillStyle = 'black';
    this.ctx.font = `${10}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(shape.name!, x, y);
  }
  private drawShape(shape: Shape, fillStyle: string, strokeStyle: string) {
    this.ctx.beginPath();
    if (shape.mode === 'circle') {
      const center = this.toCanvasCoords(shape.startX!, shape.startY!);
      const edge = this.toCanvasCoords(shape.endX!, shape.endY!);
      const r = Math.hypot(edge.x - center.x, edge.y - center.y);
      this.ctx.arc(center.x, center.y, r, 0, 2 * Math.PI);
    } else if (shape.mode === 'square') {
      const topLeft = this.toCanvasCoords(shape.startX!, shape.startY!);
      const bottomRight = this.toCanvasCoords(shape.endX!, shape.endY!);

      this.ctx.rect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );
    } else if (shape.mode === 'triangle') {
      const p1 = this.toCanvasCoords(shape.startX!, shape.startY!);
      const p2 = this.toCanvasCoords(shape.endX!, shape.endY!);
      const midX = shape.startX! * 2 - shape.endX!;
      const midY = shape.endY!;
      const p3 = this.toCanvasCoords(midX, midY);

      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.closePath();
    } else if (shape.mode === 'free' && shape.points?.length) {
      const first = this.toCanvasCoords(shape.points[0].x, shape.points[0].y);
      this.ctx.moveTo(first.x, first.y);

      for (let i = 1; i < shape.points.length; i++) {
        const p = this.toCanvasCoords(shape.points[i].x, shape.points[i].y);
        this.ctx.lineTo(p.x, p.y);
      }

      this.ctx.closePath();
    }
    this.ctx.fillStyle = fillStyle;
    this.ctx.fill();
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  hasError(ControlName: string, Errorname: string) {
    return this.mapForm.get(ControlName)?.hasError(Errorname);
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
    const baseRadius = 6;
    const radius = baseRadius;

    for (const r of this.robots) {
      const { x, y } = this.toCanvasCoords(r.x, r.y);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = r.fenceName ? 'black' : 'blue';
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
