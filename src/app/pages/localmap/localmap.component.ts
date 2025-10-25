import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { LocalmapService } from '../../_services/localmap.service';
import { MapStorageService } from '../../_services/map-storage.service';
import { RobotLocation } from '../../model/RobotLocation';
import { Shape } from '../../model/shape';
import { Subscription } from 'rxjs';
import { ToastNotificationService } from '../../shared/toast-notification/toast-notification.service';
@Component({
  selector: 'app-localmap',
  templateUrl: './localmap.component.html',
  styleUrls: ['./localmap.component.scss'],
})
export class LocalmapComponent implements AfterViewInit, OnInit {
  @ViewChild('mapImage') mapImage!: ElementRef<HTMLImageElement>;
  @ViewChild('mapCanvas') mapCanvas!: ElementRef<HTMLCanvasElement>;
  // @ViewChild('fenceModal') fenceModal!: TemplateRef<any>;
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
  private isRestricated = false;
  private originalPoints: { x: number; y: number }[] = [];
  isDrawingShape = false;
  private fittedScale = 1;
  polygons: Shape[] = [];
  currentPolygon: { x: number; y: number }[] = [];
  shapeMode: 'free' | 'square' | null = null;
  currentShape: Shape | null = null;
  circleRadius: number = 100;
  squareSize: number = 140;
  notifications: any[] = [];
  // triangleBase: number = 200;
  // triangleHeight: number = 140;
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
  hoveredShape: Shape | null = null;
  mapImageSrc: string | null = null;
  private readonly HANDLE_TOLERANCE = 10;
  restrictionPoints: { id: string; x: number; y: number }[] = [];
  private lastFenceState: { [robotId: string]: string | null } = {};
  showPath = false;
  robotPath: { x: number; y: number }[] = [];
  selectedFence: Shape | null = null;
  private clickedNonDraggableShape: boolean = false;
  isEditing: boolean = false;
  metaData: any = {};
  private readonly MAP_W = 31.9;
  private readonly MAP_H = 33.2;
  private readonly WORLD_SCALE = 30.929;
  private ignoreNextClickAfterEdit = false;
  coord: any;
  robots: RobotLocation[] = [];
  gridEnabled = false;
  gridSize = 10;
  lastFences: { [robotId: number]: string | null } = {};
  fenceLog: { robot: string; fenceName: string; time: Date }[] = [];
  robotList: any = [];
  localisationStatus: string = '';
  pendingTool: any = null;
  private skipNextMouseUp = false;
  private originalOffsetX = 0;
  private originalOffsetY = 0;
  private originalScale = 1;
  lastDirX: number | null = null;
  lastDirY: number | null = null;
  pedestrians: any[] = [];
  markers: any[] = [];
  minSquareBounds: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null = null;
  private lastRoll = 0;
  private lastPitch = 0;
  private lastYaw = 0;
  gridFlag: boolean = false;
  vibrationData: number[] = [];
  toggleMarker: boolean = false;
  private subs: Subscription[] = [];
  private fenceTracking: {
    [robotId: string]: {
      [fenceName: string]: {
        entryTime: string;
        exitTime?: string;
        durationMinutes?: any;
      };
    };
  } = {};
  private lastSafePosition: Record<string, { x: number; y: number }> = {};
  public closestPedestrianDistance: number | null = null;
  public closestPedestrian: any = null;
  togglePadestrian: boolean = false;
  toggleAura: boolean = false;
  private shapeToCopy: Shape | null = null;
  addingGeofence: boolean = false;
  selectedColor: string = '#ff0000'; // default
  closestPedestrians: any;
  lastX = 0;
  lastY = 0;
  lastZ = 0;
  colors = [
    '#ff006aff',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#000000',
    '#008080',
    '#f37934',
    '#b8312f',
    '#ffb7ce',
    '#dfc5fe',
    '#8b48d2',
    '#257623ff',
  ];
  copyMode: boolean = false;
  copiedShapeTemplate: Shape | null = null;
  lastQ = { qw: 0, qx: 0, qy: 0, qz: 0 };
  private dwellTracking: {
    [robotId: string]: {
      [fenceName: string]: {
        entryTime: string;
        exitTime?: string;
        dwellSeconds?: number;
      }[];
    };
  } = {};
  private restrictedPaths: { [robotId: string]: { x: number; y: number }[] } =
    {};
  private lastRobotPositions: {
    [robotId: string]: { x: number; y: number; timestamp: number };
  } = {};
  private restrictedToastShown: Record<string, boolean> = {};
  private restrictedReminderTimers: Record<string, any> = {};
  private lastRestrictedEntryTime: Record<string, string> = {};
  private violations: any[] = [];
  private combinedTracking: {
    [robotId: string]: {
      [fenceName: string]: {
        sessions: {
          entryTime: string;
          exitTime: string | null;
          durationMinutes: number | null;
        }[];
        totalDwellMinutes: number;
        violations: {
          type: string;
          time: string;
          [key: string]: any;
        }[];
        totalViolationsCount?: number;
      };
    };
  } = {};

  private saveCombinedData() {
    localStorage.setItem(
      'robotFenceData',
      JSON.stringify(this.combinedTracking)
    );
  }

  minMaxSpeedValidator(): ValidatorFn {
    return (controls: AbstractControl): ValidationErrors | null => {
      const minSpeed = controls.get('minSpeed')?.value;
      const maxSpeed = controls.get('maxSpeed')?.value;

      if (minSpeed != null && maxSpeed != null && maxSpeed < minSpeed) {
        return { maxLessThanMin: true };
      }
      return null;
    };
  }

  constructor(
    private localMapService: LocalmapService,
    private mapStorage: MapStorageService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
    private toastService: ToastNotificationService
  ) {}
  selectShape(mode: 'free' | 'square') {
    this.shapeMode = mode;
    this.currentPolygon = [];
    this.isDrawingShape = false;
    this.currentShape = null;
  }

  async ngOnInit(): Promise<void> {
    this.createMapForm();

    // Load map image
    const blob = await this.mapStorage.getMap('mainMap');
    if (blob) {
      const objectURL = URL.createObjectURL(blob);
      this.mapImageSrc = objectURL;
    }

    // Connect & start filters
    this.localMapService.connect();
    this.localMapService.startFilters([
      'FullPose',
      'MetaData',
      'ObjectDetections',
      'MarkerDetections',
      'GlobalTrackedMarkers',
      'SLAMStatus',
    ]);

    // Robot location subscription
    this.subs.push(
      this.localMapService.getRobotLocation().subscribe((robot) => {
        const time = Date.now();
        const vibration = this.quaternionIntensity(
          robot.qx,
          robot.qy,
          robot.qz,
          robot.qw
        );

        // update chart
        this.chartData.datasets[0].data = [
          ...this.chartData.datasets[0].data,
          { x: time, y: vibration },
        ];
        if (this.chartData.datasets[0].data.length > 200) {
          this.chartData.datasets[0].data =
            this.chartData.datasets[0].data.slice(-200);
        }

        // scale robot coords
        const scaled = this.scaleCoords(robot.x, robot.y);
        robot.x = scaled.x;
        robot.y = scaled.y;

        if (this.showPath) {
          this.robotPath.push({ x: robot.x, y: robot.y });
        }

        // update or add robot
        const idx = this.robots.findIndex((r) => r.id === robot.id);
        if (idx >= 0) {
          this.robots[idx] = robot;
        } else {
          this.robots.push(robot);
        }
        if (this.pedestrians.length > 0) {
          let minDistance = Infinity;
          let closestPed = null;

          for (const ped of this.pedestrians) {
            const dx = robot.x - ped.x;
            const dy = robot.y - ped.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDistance) {
              minDistance = dist;
              closestPed = ped;
            }
          }

          this.closestPedestrianDistance = minDistance;
          this.closestPedestrian = closestPed;
        }
        this.redraw();
      })
    );

    // Pedestrians
    this.subs.push(
      this.localMapService.getPedestrians().subscribe((peds) => {
        this.pedestrians = peds
          .map((p) => {
            if (!p.world_location) return null;
            const { x: worldX, y: worldY } = p.world_location;
            const scaled = this.scaleCoords(worldX, worldY);
            return { ...p, x: scaled.x, y: scaled.y };
          })
          .filter((p) => p !== null);
        this.redraw();
      })
    );

    // MetaData
    this.subs.push(
      this.localMapService.getMetaData().subscribe((meta) => {
        this.metaData = meta;
      })
    );

    // Localisation status
    this.subs.push(
      this.localMapService.getLocalisationStatus().subscribe((status) => {
        this.localisationStatus = status;
      })
    );

    // Markers
    this.subs.push(
      this.localMapService.getMarkers().subscribe((markers) => {
        this.markers = markers.map((m) => {
          const scaled = this.scaleCoords(m.x, m.y);
          return { ...m, x: scaled.x, y: scaled.y };
        });
        this.redraw();
      })
    );
    this.toastService.notifications$.subscribe((data) => {
      this.notifications = data;
    });
    this.changeDetector.markForCheck();
  }

  ngOnDestroy(): void {
    // stop filters
    this.localMapService.stopFilters([
      'FullPose',
      'MetaData',
      'ObjectDetections',
      'MarkerDetections',
      'GlobalTrackedMarkers',
      'SLAMStatus',
    ]);

    // unsubscribe everything
    this.subs.forEach((s) => s.unsubscribe());
    this.subs = [];
  }

  createMapForm() {
    this.mapForm = this.formBuilder.group(
      {
        fenceName: [null, [Validators.required, this.isDupliateNameValidator]],
        shapeMode: [null],
        squareSize: [200, [Validators.required, Validators.min(100)]],
        color: ['#ff0000', Validators.required],
        isRestricted: [false],
        isDrag: [true],
        isResize: [true],
        maxSpeed: [
          null,
          [Validators.required, Validators.max(10), Validators.min(0)],
        ],
        minSpeed: [
          null,
          [Validators.required, Validators.max(10), Validators.min(0)],
        ],
        speedLimit: [null, [Validators.required, Validators.max(7)]],
        timeLimitMinutes: [null, [Validators.required]],
      },
      { validators: this.minMaxSpeedValidator() }
    );
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Delete' || event.key === 'Del') {
      this.deleteSelectedFence();
    }
  }
  private saveOriginalState() {
    this.originalOffsetX = this.offsetX;
    this.originalOffsetY = this.offsetY;
    this.originalScale = this.scale;
  }
  private deleteSelectedFence() {
    if (!this.selectedFence) return;

    // Remove the selected fence from polygons array
    const index = this.polygons.findIndex(
      (shape) => shape === this.selectedFence
    );
    if (index !== -1) {
      this.polygons.splice(index, 1);
      localStorage.setItem('geoFences', JSON.stringify(this.polygons));
    }
    // Clear selection
    this.selectedFence = null;

    // Redraw canvas
    this.redraw();
  }
  startAddGeofence() {
    this.isEditing = false;
    this.editingShape = null; // new mode
    this.mapForm.reset({
      fenceName: null,
      shapeMode: 'square',
      // circleRadius: 3,
      squareSize: 150,
      // triangleBase: 2,
      // triangleHeight: 1,
      color: '#0000ff',
      isDrag: true,
      isResize: true,
      isRestricted: false,
      minSpeed: 0,
      maxSpeed: 10,
      timeLimitMinutes: 2,
      speedLimit: 0,
    });
    this.modalService.open(this.geofenceToolModal, { backdrop: 'static' });
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
        this.pendingTool = this.mapForm.value;
        this.gridEnabled = true; // <--- ENABLE GRID HERE
      }
      modal.close();
      this.redraw(); // redraw immediately to show grid
    } else {
      const data = this.mapForm.value;
      console.log('Not valid');
    }
  }
  ngAfterViewInit(): void {
    const img = this.mapImage.nativeElement;
    const canvas = this.mapCanvas.nativeElement;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    img.onload = () => {
      this.fitImageToCanvas();
      this.saveOriginalState();
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
      this.clampOffsets();
      this.coord = this.getImageCoords(event);
    });
    canvas.addEventListener('resize', () => {
      this.fitImageToCanvas();
      this.redraw();
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
      }
    });
    canvas.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      this.onWheel(event);
    });
    // Left click drag
    // this.clampOffsets();
    // if (!this.isImageFitted()) {
    //   // Only allow drag if zoomed in
    //   this.isPanning = true;
    //   this.dragStart = {
    //     x: event.clientX - this.offsetX,
    //     y: event.clientY - this.offsetY,
    //   };
    //   canvas.style.cursor = 'grabbing';
    // } else {
    //   // If fitted, disable drag
    //   this.isPanning = false;
    //   canvas.style.cursor = 'default';
    // }

    // Mouse move → pan map if right button held
    // window.addEventListener('mousemove', (event) => {
    //   if (this.isPanning && !this.isImageFitted()) {
    //     this.offsetX = event.clientX - this.dragStart.x;
    //     this.offsetY = event.clientY - this.dragStart.y;
    //     this.redraw();
    //   }
    // });

    canvas.addEventListener('mouseup', (event) => {
      if (event.button === 2 && this.isPanning) {
        this.isPanning = false;
        canvas.style.cursor = 'default';
      }
    });

    //  window.addEventListener('mouseup', (event) => {
    //   if (isPanning) {
    //     canvas.style.cursor = 'default';
    //   }
    // });
    // prevent context menu on right-click
  }

  private isImageOutsideCanvas(): boolean {
    const canvas = this.mapCanvas.nativeElement;
    const img = this.mapImage.nativeElement;

    const width = img.naturalWidth * this.scale;
    const height = img.naturalHeight * this.scale;

    // Image boundaries on canvas
    const left = this.offsetX;
    const right = this.offsetX + width;
    const top = this.offsetY;
    const bottom = this.offsetY + height;

    // ✅ If image is completely outside canvas bounds
    if (right < 0 || left > canvas.width || bottom < 0 || top > canvas.height) {
      return true;
    }

    return false;
  }
  @HostListener('mouseleave', ['$event'])
  onMouseLeave(event: MouseEvent) {
    if (this.isPanning) {
      this.resetView(); // or just stop panning if you don’t want auto reset
      this.isPanning = false;
      this.mapCanvas.nativeElement.style.cursor = 'default';
    }
  }
  // @HostListener('document:mouseup', ['$event'])
  // onMouseUp(event: MouseEvent) {
  //   // Stop resizing or dragging if mouse is released anywhere
  //   this.draggingShape = null;
  //   this.resizingShape = null;
  //   this.activeHandleIndex = null;
  //   this.originalPoints = [];
  //   this.isPanning = false;

  //   this.mapCanvas.nativeElement.style.cursor = 'default';
  // }
  @HostListener('window:mouseup', ['$event'])
  onWindowMouseUp(event: MouseEvent) {
    if (this.isPanning) {
      this.resetView();
    }
    this.draggingShape = null;
    this.resizingShape = null;
    this.activeHandleIndex = null;
    this.originalPoints = [];
    this.isPanning = false;
    this.mapCanvas.nativeElement.style.cursor = 'default';
  }
  private clampOffsets() {
    const img: HTMLImageElement = this.mapImage.nativeElement;
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;

    const scaledWidth = img.naturalWidth * this.scale;
    const scaledHeight = img.naturalHeight * this.scale;
    // image must cover canvas → clamp offset
    const minX = canvas.clientWidth - scaledWidth;
    const minY = canvas.clientHeight - scaledHeight;

    // If image smaller than canvas, center it
    if (scaledWidth <= canvas.clientWidth) {
      this.offsetX = (canvas.clientWidth - scaledWidth) / 2;
    } else {
      this.offsetX = Math.min(0, Math.max(this.offsetX, minX));
    }

    if (scaledHeight <= canvas.clientHeight) {
      this.offsetY = (canvas.clientHeight - scaledHeight) / 2;
    } else {
      this.offsetY = Math.min(0, Math.max(this.offsetY, minY));
    }
  }
  resetView() {
    this.fitImageToCanvas();
    this.offsetX = this.originalOffsetX;
    this.offsetY = this.originalOffsetY;
    this.scale = this.originalScale;
    this.isPanning = false;
    this.redraw();
  }
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.mapCanvas.nativeElement) return;
    if (event.target !== this.mapCanvas.nativeElement) return;

    const { x, y } = this.getTransformedCoords(event);
    const mouseCanvas = this.toCanvasCoords(x, y);
    let foundHover = false;

    // 🔹 Hover detection
    for (let i = this.polygons.length - 1; i >= 0; i--) {
      if (this.isPointInShape({ x, y }, this.polygons[i])) {
        this.hoveredShape = this.polygons[i];
        foundHover = true;
        break;
      }
    }
    if (!foundHover) this.hoveredShape = null;
    this.redraw();

    // 🔹 Handle panning
    if (this.isPanning) {
      this.offsetX = event.clientX - this.dragStart.x;
      this.offsetY = event.clientY - this.dragStart.y;
      if (this.isImageOutsideCanvas()) {
        this.resetView();
        return;
      }
      this.redraw();
      return;
    }

    // 🔹 Update cursor on hover
    if (this.hoveredShape) {
      const near = this.isNearHandle(this.hoveredShape, mouseCanvas);
      if (near) {
        if (near.kind === 'ew') {
          this.mapCanvas.nativeElement.style.cursor = 'ew-resize';
        } else {
          this.mapCanvas.nativeElement.style.cursor = 'nwse-resize';
        }
      } else if (this.hoveredShape.isDraggable) {
        this.mapCanvas.nativeElement.style.cursor = 'move';
      } else {
        this.mapCanvas.nativeElement.style.cursor = 'default';
      }
    } else {
      this.mapCanvas.nativeElement.style.cursor = 'default';
    }
    //Resize
    if (
      this.resizingShape &&
      this.activeHandleIndex !== null &&
      this.resizingShape.points
    ) {
      const handleIndex = this.activeHandleIndex;
      const fixedIndex = (handleIndex + 2) % 4;
      const fixed = this.resizingShape.points[fixedIndex];

      // DON'T clamp mouse position - use raw coordinates
      const mousePos = { x, y }; // Remove clampToCanvas here

      let dx = mousePos.x - fixed.x;
      let dy = mousePos.y - fixed.y;

      // Maintain square aspect ratio
      let size = Math.max(Math.abs(dx), Math.abs(dy));

      const MIN_SIZE = 50;
      const MAX_SIZE = 300;

      // Clamp size
      size = Math.max(MIN_SIZE, Math.min(size, MAX_SIZE));

      // Preserve direction of drag
      const signX = dx >= 0 ? 1 : -1;
      const signY = dy >= 0 ? 1 : -1;

      // Calculate new corner positions
      const movingX = fixed.x + size * signX;
      const movingY = fixed.y + size * signY;

      // Update all corners based on which handle is being dragged
      const newPoints = [...this.resizingShape.points];

      switch (handleIndex) {
        case 0: // top-left
          newPoints[0] = { x: movingX, y: movingY };
          newPoints[1] = { x: movingX + size, y: movingY };
          newPoints[2] = { x: movingX + size, y: movingY + size };
          newPoints[3] = { x: movingX, y: movingY + size };
          break;
        case 1: // top-right
          newPoints[1] = { x: movingX, y: movingY };
          newPoints[0] = { x: movingX - size, y: movingY };
          newPoints[3] = { x: movingX - size, y: movingY + size };
          newPoints[2] = { x: movingX, y: movingY + size };
          break;
        case 2: // bottom-right
          newPoints[2] = { x: movingX, y: movingY };
          newPoints[1] = { x: movingX, y: movingY - size };
          newPoints[0] = { x: movingX - size, y: movingY - size };
          newPoints[3] = { x: movingX - size, y: movingY };
          break;
        case 3: // bottom-left
          newPoints[3] = { x: movingX, y: movingY };
          newPoints[0] = { x: movingX, y: movingY - size };
          newPoints[1] = { x: movingX + size, y: movingY - size };
          newPoints[2] = { x: movingX + size, y: movingY };
          break;
      }

      // Optional: Check if shape stays within canvas bounds
      const img = this.mapImage.nativeElement;
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      const allInBounds = newPoints.every(
        (p) => p.x >= 0 && p.x <= imgWidth && p.y >= 0 && p.y <= imgHeight
      );

      // Check overlap
      const idx = this.polygons.indexOf(this.resizingShape);
      const wouldOverlap = this.doesShapeOverlap(
        { ...this.resizingShape, points: newPoints },
        idx
      );

      // Only update if valid (in bounds and no overlap)
      if (allInBounds && !wouldOverlap) {
        this.resizingShape.points = newPoints;
      }

      this.redraw();
      return; // ✅ Prevent fallback dragging
    }
    if (this.draggingShape) {
      if (event.buttons !== 1) {
        // mouse released unexpectedly
        this.draggingShape = null;
        this.resizingShape = null;
        this.activeHandleIndex = null;
        this.originalPoints = [];
        return;
      }

      const dx = x - this.dragOffset.x;
      const dy = y - this.dragOffset.y;

      if (this.draggingShape.points) {
        // move all points by same offset
        const movedPoints = this.originalPoints.map((p) => ({
          x: p.x + dx,
          y: p.y + dy,
        }));

        // clamp to canvas
        const img = this.mapImage.nativeElement;
        const minX = Math.min(...movedPoints.map((p) => p.x));
        const minY = Math.min(...movedPoints.map((p) => p.y));
        const maxX = Math.max(...movedPoints.map((p) => p.x));
        const maxY = Math.max(...movedPoints.map((p) => p.y));

        const shiftX = Math.max(0 - minX, Math.min(0, img.naturalWidth - maxX));
        const shiftY = Math.max(
          0 - minY,
          Math.min(0, img.naturalHeight - maxY)
        );

        this.draggingShape.points = movedPoints.map((p) => ({
          x: p.x + shiftX,
          y: p.y + shiftY,
        }));
      }

      if (this.clickedNonDraggableShape) {
        this.currentShape = null;
        this.draggingShape = null;
        this.resizingShape = null;
        this.activeHandleIndex = null;
      }

      this.redraw();
      return;
    }

    if (this.isDrawingShape && this.currentShape) {
      if (this.shapeMode === 'square' && this.currentShape.points) {
        const last = this.clampToCanvas(x, y);
        const first = this.currentShape.points[0];
        // make proper square dynamically as mouse moves
        const width = last.x - first.x;
        const height = last.y - first.y;
        const size = Math.max(Math.abs(width), Math.abs(height));
        const endX = width >= 0 ? first.x + size : first.x - size;
        const endY = height >= 0 ? first.y + size : first.y - size;
        this.currentShape.points = [
          { x: first.x, y: first.y },
          { x: endX, y: first.y },
          { x: endX, y: endY },
          { x: first.x, y: endY },
        ];
      } else if (this.shapeMode === 'free' && this.currentShape.points) {
        // free mode continues dynamically
        const last = this.clampToCanvas(x, y);
        this.currentShape.points[this.currentShape.points.length - 1] = last;
      }
      this.redraw();
    }
  }

  private clampToCanvas(x: number, y: number) {
    const img = this.mapImage.nativeElement;
    const maxX = img.naturalWidth;
    const maxY = img.naturalHeight;

    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }

  private getShapeCorners(shape: Shape): { x: number; y: number }[] {
    if (shape.points && shape.points.length === 4) {
      return shape.points;
    }
    return [];
  }

  private getImageCoords(event: MouseEvent) {
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    let imgX = (cssX - this.offsetX) / this.scale;
    let imgY = (cssY - this.offsetY) / this.scale;

    imgY = this.mapImage.nativeElement.naturalHeight - imgY;

    return { x: imgX, y: imgY };
  }

  private getTransformedCoords(event: MouseEvent) {
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    let imgX = (canvasX - this.offsetX) / this.scale;
    let imgY = (canvasY - this.offsetY) / this.scale;
    imgY = this.mapImage.nativeElement.naturalHeight - imgY;
    return { x: imgX, y: imgY };
  }

  private toCanvasCoords(imgX: number, imgY: number) {
    const canvasX = imgX * this.scale + this.offsetX;
    const canvasY =
      (this.mapImage.nativeElement.naturalHeight - imgY) * this.scale +
      this.offsetY;
    return { x: canvasX, y: canvasY };
  }
  private normalizeSquare(shape: Shape): { x: number; y: number }[] {
    if (shape.mode !== 'square' || !shape.points || shape.points.length < 2)
      return shape.points || [];

    // Find min/max from points
    const xs = shape.points.map((p) => p.x);
    const ys = shape.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Compute square side length (use larger dimension to keep it perfect)
    const side = Math.max(maxX - minX, maxY - minY);

    // Build normalized corners
    const normalizedPoints = [
      { x: minX, y: minY }, // top-left
      { x: minX + side, y: minY }, // top-right
      { x: minX + side, y: minY + side }, // bottom-right
      { x: minX, y: minY + side }, // bottom-left
    ];

    // 🔄 Update both styles for compatibility
    // shape.startX = minX;
    // shape.startY = minY;
    // shape.endX = minX + side;
    // shape.endY = minY + side;
    shape.points = normalizedPoints;

    return normalizedPoints;
  }

  // completeFreeGeofence() {
  //   if (this.currentPolygon.length >= 3) {
  //     this.polygons.push({
  //       mode: 'free',
  //       points: [...this.currentPolygon] /* ...otherProps */,
  //     });
  //     this.currentPolygon = [];
  //     this.isDrawingShape = false;
  //     this.shapeMode = null;
  //     this.redraw();
  //   }
  // }

  // Undo the last placed point in the currentPolygon
  undoLastFreePoint() {
    if (this.currentPolygon.length > 0) {
      this.currentPolygon.pop();
      this.redraw();
    }
  }
  copyGeofence() {
    this.copyMode = true;
    this.copiedShapeTemplate = null; // reset any previous copy
    alert('Click on a shape to copy.');
  }
  finalizeShape() {
    if (!this.isDrawingShape || !this.currentPolygon.length) {
      alert('No shape to finalize');
      return;
    }

    const fenceName = this.mapForm.controls['fenceName'].value;
    if (!fenceName) {
      alert('Please enter a name for the fence.');
      return;
    }

    const newShape: Shape = {
      mode: this.shapeMode!,
      points: [...this.currentPolygon],
      name: fenceName,
      isDraggable: this.mapForm.controls['isDrag'].value,
      isResizable: this.mapForm.controls['isResize'].value,
      color: this.mapForm.controls['color'].value,
      isRestricted: this.mapForm.controls['isRestricted'].value,
      speedLimit: this.mapForm.controls['speedLimit'].value,
      maxSpeed: this.mapForm.controls['maxSpeed'].value,
      minSpeed: this.mapForm.controls['minSpeed'].value,
      timeLimitMinutes: this.mapForm.controls['timeLimitMinutes'].value,
    };
    if (!this.doesShapeOverlap(newShape)) {
      this.polygons.push(newShape);
      localStorage.setItem('geoFences', JSON.stringify(this.polygons));
    } else {
      alert('shape is overlapped existing shape');
    }
    this.gridEnabled = false;
    this.currentPolygon = [];
    this.shapeMode = null;
    this.isDrawingShape = false;
    this.redraw();
  }
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;
    const { x, y } = this.getTransformedCoords(event);
    this.lastMouseDownPos = { x: event.clientX, y: event.clientY };
    this.dragDistance = 0;
    this.suppressClick = false;
    for (let shape of this.polygons) {
      if (this.isPointInShape({ x, y }, shape)) {
        this.selectedFence = shape; // <-- Set selected fence here
        this.redraw(); // Optional: highlight selected fence
        // return;
      }
    }
    if (this.copyMode) {
      if (!this.copiedShapeTemplate) {
        // Step 1: select a shape to copy
        for (let i = this.polygons.length - 1; i >= 0; i--) {
          if (this.isPointInShape({ x, y }, this.polygons[i])) {
            this.copiedShapeTemplate = JSON.parse(
              JSON.stringify(this.polygons[i])
            );
            alert('Now click on canvas to place the copy.');
            return;
          }
        }
      } else {
        // Step 2: place copy
        const newShape: Shape = JSON.parse(
          JSON.stringify(this.copiedShapeTemplate)
        );

        if (newShape.points) {
          const dx = x - newShape.points[0].x;
          const dy = y - newShape.points[0].y;
          newShape.points = newShape.points.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
        }
        // if (newShape.mode === 'free' && newShape.points) {
        //   // Use first point as reference
        //   const firstPoint = newShape.points[0];
        //   const dx = x - firstPoint.x;
        //   const dy = y - firstPoint.y;

        //   newShape.points = newShape.points.map((p) => ({
        //     x: p.x + dx,
        //     y: p.y + dy,
        //   }));
        // } else {
        //   // Default (square, circle, etc.)
        //   const dx = x - newShape.startX!;
        //   const dy = y - newShape.startY!;
        //   newShape.startX! += dx;
        //   newShape.startY! += dy;
        //   newShape.endX! += dx;
        //   newShape.endY! += dy;
        // }

        // ✅ Give unique name
        if (this.copiedShapeTemplate.name) {
          const baseName = this.copiedShapeTemplate.name.replace(/\s+\d+$/, '');
          let counter = 1;
          while (
            this.polygons.some((s) => s.name === `${baseName} ${counter}`)
          ) {
            counter++;
          }
          newShape.name = `${baseName} ${counter}`;
        } else {
          newShape.name = 'Shape 1';
        }

        // ✅ Prevent overlap
        if (this.doesShapeOverlap(newShape)) {
          alert('Cannot place copy: it overlaps with an existing shape.');
          this.copyMode = false;
          this.copiedShapeTemplate = null;
          return;
        }

        // ✅ Save
        this.polygons.push(newShape);
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        this.copyMode = false;
        this.copiedShapeTemplate = null;
        this.redraw();
      }
    }
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
    if (this.pendingTool) {
      const tool = this.pendingTool;
      let newShape: Shape | null = null;
      const topLeft = { x, y };
      const topRight = { x: x + tool.squareSize, y };
      const bottomRight = { x: x + tool.squareSize, y: y + tool.squareSize };
      const bottomLeft = { x, y: y + tool.squareSize };
      if (tool.shapeMode === 'square') {
        // Directly create fixed square on click
        newShape = {
          mode: 'square',
          // startX: x,
          // startY: y,
          // endX: x + tool.squareSize,
          // endY: y + tool.squareSize,
          color: tool.color,
          isDraggable: tool.isDrag,
          isResizable: tool.isResize,
          name: tool.fenceName,
          isRestricted: tool.isRestricted,
          maxSpeed: tool.maxSpeed,
          minSpeed: tool.minSpeed,
          speedLimit: tool.speedLimit,
          timeLimitMinutes: tool.timeLimitMinutes,
          points: [topLeft, topRight, bottomRight, bottomLeft],
        };
        this.gridEnabled = false;
        this.normalizeSquare(newShape);
      } else if (tool.shapeMode === 'free') {
        // Start free polygon drawing
        this.shapeMode = 'free';
        // this.currentPolygon = [{ x, y }];
        this.isDrawingShape = true;
        this.redraw();
        this.pendingTool = null;
        return;
      }

      if (newShape) {
        if (this.isDuplicateName(newShape.name)) return;
        if (!this.doesShapeOverlap(newShape)) {
          if (!this.isShapeInsideCanvas(newShape)) {
            alert('Fence is outside the boundary!');
          } else {
            this.polygons.push(newShape);
            localStorage.setItem('geoFences', JSON.stringify(this.polygons));
            this.redraw();
          }
        } else {
          alert('Invalid shape: overlaps another!');
        }
      }

      this.pendingTool = null;
      return;
    }
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
        if (this.hoveredShape.mode === 'square') {
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
      if (!this.isEditing && this.isPointInShape({ x, y }, this.hoveredShape)) {
        if (!this.hoveredShape.isDraggable) {
          this.clickedNonDraggableShape = true;
          this.currentShape = null;
          this.isDrawingShape = false;
          return;
        }
        this.draggingShape = this.hoveredShape;
        this.dragOffset = { x, y };
        if (this.draggingShape.points) {
          this.originalPoints = this.draggingShape.points.map((p) => ({
            ...p,
          }));
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
      // this.currentPolygon.push({ x, y });
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
        // startX: x,
        // startY: y,
        // endX: x,
        // endY: y,
        isDraggable: this.mapForm.value.isDrag,
        isResizable: this.mapForm.value.isResize,
        isRestricted: this.mapForm.controls['isRestricted'].value,
        maxSpeed: this.mapForm.controls['maxSpeed'].value,
        minSpeed: this.mapForm.controls['minSpeed'].value,
        speedLimit: this.mapForm.controls['speedLimit'].value,
        timeLimitMinutes: this.mapForm.controls['timeLimitMinutes'].value,
      } as Shape;
      this.isDrawingShape = true;
      return;
    }

    // fallback: nothing to do
  }
  private worldToCanvas(wx: number, wy: number): { x: number; y: number } {
    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // ratio between device pixels and CSS pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // world → CSS px → device px
    const cx = (wx * this.scale + this.offsetX) * scaleX;
    const cy = (wy * this.scale + this.offsetY) * scaleY;

    return { x: cx, y: cy };
  }

  private isShapeInsideCanvas(shape: Shape): boolean {
    const img = this.mapImage.nativeElement;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const withinBounds = (
      minX: number,
      maxX: number,
      minY: number,
      maxY: number
    ) => {
      if (minX < 0) return false;
      if (minY < 0) return false;
      if (maxX > imgWidth) return false;
      if (maxY > imgHeight) return false;
      return true;
    };

    if (shape.mode === 'square') {
      const cornersWorld = this.getShapeCorners(shape); // already in world coords!
      const minX = Math.min(...cornersWorld.map((c) => c.x));
      const maxX = Math.max(...cornersWorld.map((c) => c.x));
      const minY = Math.min(...cornersWorld.map((c) => c.y));
      const maxY = Math.max(...cornersWorld.map((c) => c.y));

      return withinBounds(minX, maxX, minY, maxY);
    }

    if (shape.mode === 'free' && shape.points) {
      const minX = Math.min(...shape.points.map((p) => p.x));
      const maxX = Math.max(...shape.points.map((p) => p.x));
      const minY = Math.min(...shape.points.map((p) => p.y));
      const maxY = Math.max(...shape.points.map((p) => p.y));

      return withinBounds(minX, maxX, minY, maxY);
    }

    return true;
  }
  toggleGrid() {
    this.gridEnabled = !this.gridEnabled;
    this.redraw();
  }
  chartData: ChartConfiguration<'line'>['data'] = {
    datasets: [
      {
        label: 'Vibration Intensity',
        data: [] as { x: number; y: number }[], // 👈 tell TS what your points look like
        borderColor: 'rgba(0, 200, 0, 0.8)',
        borderWidth: 1,
        pointRadius: 0,
        fill: true,
        backgroundColor: 'rgba(0, 200, 0, 0.2)',
        tension: 0.3,
      },
    ],
  };

  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    animation: { duration: 0 },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'second' },
        ticks: { display: true },
      },
      y: {
        title: { display: true, text: 'Intensity' },
      },
    },
  };
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
      const strokeColor = shape.color;
      const fillColor = shape.color
        ? this.hexToRgba(shape.color, 0.3)
        : 'rgba(255,0,0,0.3)';
      this.drawShape(shape, fillColor, strokeColor);
      if (shape.name) this.drawShapeLabel(shape);
    });
    if (this.isDrawingShape && !this.draggingShape && !this.resizingShape) {
      if (this.shapeMode === 'free' && this.currentPolygon.length > 0) {
        this.selectedColor = this.mapForm.get('color')?.value;

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
      if (this.hoveredShape.mode === 'square') {
        const corners = this.getShapeCorners(this.hoveredShape);

        for (let c of corners) {
          const cCanvas = this.toCanvasCoords(c.x, c.y);
          this.ctx.beginPath();
          this.ctx.rect(
            cCanvas.x - scaledHandleSize / 2,
            cCanvas.y - scaledHandleSize / 2,
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
    if (this.markers && this.toggleMarker) {
      this.markers.forEach((marker) => {
        const c = this.toCanvasCoords(marker.x, marker.y);
        const yaw = this.quaternionToYawFixed(
          marker.qx,
          marker.qy,
          marker.qz,
          marker.qw
        );

        this.ctx.save();
        this.ctx.translate(c.x, c.y);
        this.ctx.rotate(yaw);

        // --- Base circle (robot body) ---
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 8, 0, 2 * Math.PI, false);
        this.ctx.fillStyle = '#ff0000ff'; // Slamcore-style blue
        this.ctx.fill();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'white'; // nice outline
        this.ctx.stroke();

        // --- Directional pointer ---
        this.ctx.beginPath();
        this.ctx.moveTo(8, 0); // starts at circle edge
        this.ctx.lineTo(18, 0); // forward pointer
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#ff0000ff';
        this.ctx.stroke();

        // Optional: little arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(18, 0);
        this.ctx.lineTo(14, -4);
        this.ctx.lineTo(14, 4);
        this.ctx.closePath();
        this.ctx.fillStyle = '#ff0000ff';
        this.ctx.fill();
        this.ctx.restore();
        // --- Marker ID (above marker) ---
        this.ctx.fillStyle = 'black';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(marker.id.toString(), c.x, c.y - 14);
      });
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
      ctx.strokeStyle = '#ff8c1a'; // orange color similar to your image
      ctx.lineWidth = 1.5; // thinner line
      ctx.lineJoin = 'round'; // smoother corners
      ctx.lineCap = 'round'; // rounded path ends
      ctx.globalAlpha = 0.9;
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
    this.drawGrid();
    this.drawRobots();
    this.drawPedestrians();
  }
  // @HostListener('mouseleave', ['$event'])
  // onMouseLeave(event: MouseEvent) {
  //   console.log('leavee');
  //   if (this.isPanning) {
  //     this.resetView();
  //   }
  // }
  private hexToRgba(hex: string, alpha: number): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  onCanvasClick(event: MouseEvent) {
    if (this.suppressClick) {
      this.suppressClick = false; // reset
      return;
    }
    if (event.button !== 0) return;
    // if (event.target !== this.mapCanvas.nativeElement) return;
    const { x, y } = this.getTransformedCoords(event);

    const snappedX = Math.floor(x / this.gridSize) * this.gridSize;
    const snappedY = Math.floor(y / this.gridSize) * this.gridSize;

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
        return;
        // brand new polygon
        // this.currentPolygon = [{ x, y }];
        // this.isDrawingShape = true;
      } else {
        // add more points
        this.currentPolygon.push({ x, y });
        this.redraw();
      }
    }

    // this.currentShape = {
    //   mode: this.shapeMode,
    //   startX: snappedX,
    //   startY: snappedY,
    //   endX: snappedX + 50, // default size
    //   endY: snappedY + 50,
    //   isDraggable: this.mapForm.value.isDrag,
    //   isResizable: this.mapForm.value.isResize,
    //   isRestricted: this.mapForm.controls['isRestricted'].value,
    //   maxSpeed: this.mapForm.controls['maxSpeed'].value,
    //   minSpeed: this.mapForm.controls['minSpeed'].value,
    //   speedLimit: this.mapForm.controls['speedLimit'].value,
    //   timeLimitMinutes: this.mapForm.controls['timeLimitMinutes'].value,
    // };
  }

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
    if (!shape.points || shape.points.length < 3) return false;

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.beginPath();

    const first = this.toCanvasCoords(shape.points[0].x, shape.points[0].y);
    this.ctx.moveTo(first.x, first.y);
    for (let i = 1; i < shape.points.length; i++) {
      const p = this.toCanvasCoords(shape.points[i].x, shape.points[i].y);
      this.ctx.lineTo(p.x, p.y);
    }
    this.ctx.closePath();

    const canvasPt = this.toCanvasCoords(point.x, point.y);
    const result = this.ctx.isPointInPath(canvasPt.x, canvasPt.y);
    this.ctx.restore();
    return result;
  }

  isNearHandle(shape: Shape | null, mouseCanvas: { x: number; y: number }) {
    if (!shape) return null;

    const tol = 10; // fixed 10px tolerance, independent of zoom

    if (shape.mode === 'square') {
      const corners = this.getShapeCorners(shape);
      for (let i = 0; i < corners.length; i++) {
        const cCanvas = this.toCanvasCoords(corners[i].x, corners[i].y);
        const dist = Math.hypot(
          mouseCanvas.x - cCanvas.x,
          mouseCanvas.y - cCanvas.y
        );
        if (dist <= tol) {
          return { kind: 'nwse', index: i };
        }
      }
    } else if (shape.mode === 'free' && shape.points) {
      const canvasPoints = shape.points.map((p) =>
        this.toCanvasCoords(p.x, p.y)
      );
      for (let i = 0; i < canvasPoints.length; i++) {
        const p = canvasPoints[i];
        const dist = Math.hypot(mouseCanvas.x - p.x, mouseCanvas.y - p.y);
        if (dist <= tol) {
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
        this.draggingShape.points = this.originalPoints.map((p) => ({
          ...p,
        }));
      }
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.shapeMode === 'free') {
      return; // don't save free polygon here, handled by dblclick
    }
    if (this.copiedShapeTemplate) {
      const { x, y } = this.getTransformedCoords(event);

      const placedShape: Shape = JSON.parse(
        JSON.stringify(this.copiedShapeTemplate)
      );

      // Calculate offset (keep size same, move to clicked position)
      const dx = x - placedShape.startX!;
      const dy = y - placedShape.startY!;

      if (placedShape.mode === 'free' && placedShape.points) {
        placedShape.points = placedShape.points.map((pt) => ({
          x: pt.x + dx,
          y: pt.y + dy,
        }));
      } else if (placedShape.mode === 'square' && placedShape.points) {
        placedShape.points = placedShape.points.map((pt) => ({
          x: pt.x + dx,
          y: pt.y + dy,
        }));

        // ✅ Normalize copied square before saving
        placedShape.points = this.normalizeSquare(placedShape);
      } else {
        placedShape.startX! += dx;
        placedShape.startY! += dy;
        placedShape.endX! += dx;
        placedShape.endY! += dy;
      }
      if (!this.doesShapeOverlap(placedShape)) {
        this.polygons.push(placedShape);
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        this.redraw();
      } else {
        alert('Invalid copy: overlaps another fence!');
      }

      this.copiedShapeTemplate = null;
      return;
    }

    if (event.target !== this.mapCanvas.nativeElement) return;
    const { x, y } = this.getTransformedCoords(event);
    if (this.isEditing) {
      // block all drag/resizing after edit modal until next interaction
      this.clickedNonDraggableShape = false;
      this.draggingShape = null;
      this.resizingShape = null;
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
      if (this.draggingShape?.mode === 'square' && this.draggingShape.points) {
        this.draggingShape.points = this.normalizeSquare(this.draggingShape);
      }
      const idx = this.polygons.indexOf(this.draggingShape);
      if (this.doesShapeOverlap(this.draggingShape, idx)) {
        this.originalCoordinates(); // if fences are overlaps then it goes to the original coordinates
        alert('Invalid move: shape overlaps another!');
      } else {
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
      }
      this.isDrawingShape = false;
      this.currentPolygon = [];
      this.draggingShape = null;
      this.clickedNonDraggableShape = false;
      this.redraw();
      return;
    }

    if (!this.isDrawingShape || !this.currentShape) return;
    if (this.currentShape.mode === 'square' && this.currentShape.points) {
      // ✅ Normalize before saving final drawn square
      this.currentShape.points = this.normalizeSquare(this.currentShape);
    }

    if (!this.doesShapeOverlap(this.currentShape)) {
      // this.finishShape(this.currentShape);
    } else {
      alert('Invalid shape: outside boundary or overlaps!');
    }
    this.currentPolygon = [];
    this.currentShape = null;
    this.isDrawingShape = false;
    this.redraw();
    this.clickedNonDraggableShape = false;
  }

  private getStoredGeofences(): any[] {
    const stored = localStorage.getItem('geoFences');
    return stored ? JSON.parse(stored) : [];
  }

  private isPointInPolygon(
    point: { x: number; y: number },
    polygon: { x: number; y: number }[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

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
    // if (
    //   this.shapeMode === 'free' &&
    //   this.isDrawingShape &&
    //   this.currentPolygon.length > 2
    // ) {
    //   const fenceName = this.mapForm.controls['fenceName'].value;
    //   const isDrag = this.mapForm.controls['isDrag'].value;
    //   const isResize = this.mapForm.controls['isResize'].value;
    //   const color = this.mapForm.controls['color'].value;

    //   if (!fenceName) {
    //     alert('Please enter a name for the fence.');
    //     return;
    //   }

    //   const newShape: Shape = {
    //     mode: 'free',
    //     points: [...this.currentPolygon],
    //     name: fenceName,
    //     isDraggable: isDrag,
    //     isResizable: isResize,
    //     color: color,
    //   };

    //   if (!this.doesShapeOverlap(newShape)) {
    //     this.polygons.push(newShape);
    //     localStorage.setItem('geoFences', JSON.stringify(this.polygons));
    //   }

    //   this.currentPolygon = [];
    //   this.shapeMode = null;
    //   this.isDrawingShape = false;
    //   this.redraw();

    //   // ✅ tell mouseup to skip saving
    //   this.skipNextMouseUp = true;
    // }
  }
  private drawGrid() {
    if (!this.gridEnabled) return;

    const canvas: HTMLCanvasElement = this.mapCanvas.nativeElement;
    const ctx = this.ctx!;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    ctx.save();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;

    // Draw grid in **screen pixels**, ignoring scale
    for (let x = 0; x <= width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
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
  toggleMarkers() {
    this.toggleMarker = !this.toggleMarker;
  }

  togglePadestrians() {
    this.togglePadestrian = !this.togglePadestrian;
  }

  toggleAuras() {
    this.toggleAura = !this.toggleAura;
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
    const newPoly = this.shapeToPolygon(newShape);
    for (let i = 0; i < this.polygons.length; i++) {
      if (ignoreIndex !== null && i === ignoreIndex) continue;
      const otherPoly = this.shapeToPolygon(this.polygons[i]);
      if (this.polygonsOverlap(newPoly, otherPoly)) {
        return true;
      }
    }
    return false;
  }

  private shapeToPolygon(shape: Shape): { x: number; y: number }[] {
    if ((shape.mode === 'square' || shape.mode === 'free') && shape.points) {
      return shape.points;
    }
    return [];
  }
  private polygonsOverlap(
    polyA: { x: number; y: number }[],
    polyB: { x: number; y: number }[]
  ): boolean {
    // 1. Quick reject using bounding boxes
    const boxA = this.getBoundingBox(polyA);
    const boxB = this.getBoundingBox(polyB);
    if (
      boxA.maxX < boxB.minX ||
      boxB.maxX < boxA.minX ||
      boxA.maxY < boxB.minY ||
      boxB.maxY < boxA.minY
    ) {
      return false; // no overlap at all
    }

    // 2. Check if any edges intersect
    for (let i = 0; i < polyA.length; i++) {
      const a1 = polyA[i];
      const a2 = polyA[(i + 1) % polyA.length];
      for (let j = 0; j < polyB.length; j++) {
        const b1 = polyB[j];
        const b2 = polyB[(j + 1) % polyB.length];
        if (this.linesIntersect(a1, a2, b1, b2)) {
          return true;
        }
      }
    }

    // 3. Check if one polygon is fully inside another
    if (this.pointInPolygon(polyA[0], polyB)) return true;
    if (this.pointInPolygon(polyB[0], polyA)) return true;

    return false;
  }

  private getBoundingBox(poly: { x: number; y: number }[]) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  private linesIntersect(p1: any, p2: any, p3: any, p4: any): boolean {
    const d1 = this.direction(p3, p4, p1);
    const d2 = this.direction(p3, p4, p2);
    const d3 = this.direction(p1, p2, p3);
    const d4 = this.direction(p1, p2, p4);

    if (
      ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    ) {
      return true;
    }
    return false;
  }

  private direction(pi: any, pj: any, pk: any): number {
    return (pk.x - pi.x) * (pj.y - pi.y) - (pj.x - pi.x) * (pk.y - pi.y);
  }

  private pointInPolygon(
    point: { x: number; y: number },
    poly: { x: number; y: number }[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x,
        yi = poly[i].y;
      const xj = poly[j].x,
        yj = poly[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
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
      color: this.selectedFence.color || '#ff0000',
      isRestricated: this.selectedFence.isRestricted,
      shapeMode: this.selectedFence.shapeMode,
      speedLimit: this.selectedFence.speedLimit,
      timeLimitMinutes: this.selectedFence.timeLimitMinutes,
      maxSpeed: this.selectedFence.maxSpeed,
      minSpeed: this.selectedFence.minSpeed,
    });
    const modalRef = this.modalService.open(this.geofenceToolModal, {
      backdrop: 'static',
    });

    modalRef.result
      .then(() => {
        const fenceName = this.mapForm.controls['fenceName'].value;
        const isDrag = this.mapForm.controls['isDrag'].value;
        const isResize = this.mapForm.controls['isResize'].value;
        const color = this.mapForm.controls['color'].value;
        const isRestricated = this.mapForm.controls['isRestricted'].value;
        const maxSpeed = this.mapForm.controls['maxSpeed'].value;
        const minSpeed = this.mapForm.controls['minSpeed'].value;

        const shapeMode = this.mapForm.controls['shapeMode'].value;
        const speedLimit = this.mapForm.controls['speedLimit'].value;
        const timeLimitMinutes =
          this.mapForm.controls['timeLimitMinutes'].value;
        if (this.isDuplicateName(fenceName, this.selectedFence)) {
          return;
        }
        if (this.selectedFence) {
          this.selectedFence.name = fenceName;
          this.selectedFence.isDraggable = isDrag;
          this.selectedFence.isResizable = isResize;
          this.selectedFence.color = color;
          this.selectedFence.isRestricted = isRestricated;
          this.selectedFence.minSpeed = minSpeed;
          this.selectedFence.maxSpeed = maxSpeed;
          this.selectedFence.shapeMode = shapeMode;
          this.selectedFence.speedLimit = speedLimit;
          this.selectedFence.timeLimitMinutes = timeLimitMinutes;
        }
        const idx = this.polygons.indexOf(this.selectedFence!);

        if (this.doesShapeOverlap(this.selectedFence!, idx)) {
          alert('Invalid edit: overlaps another shape!');
          this.originalCoordinates(); // rollback
          return;
        }
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        // this.carSocket.updateFences(this.polygons);

        this.resetEditState();
        this.ignoreNextClickAfterEdit = true;
        // this.shapeMode = null;
        this.pendingTool = null;
        this.isDrawingShape = false;
        this.currentShape = null;
        this.gridEnabled = false;
        this.redraw();
      })
      .catch(() => {
        this.resetEditState();
        // this.ignoreNextClickAfterEdit = true;
      });
  }

  private resetEditState() {
    this.isEditing = false;
    this.selectedFence = null;
    this.shapeMode = null;
    this.clickedNonDraggableShape = false;
    this.draggingShape = null;
    this.resizingShape = null;
    this.activeHandleIndex = null;
    this.hoveredShape = null;
    this.originalPoints = [];
  }

  clearGeofences() {
    this.polygons = [];
    this.currentPolygon = [];
    localStorage.removeItem('geoFences');
    this.redraw();
  }

  private drawShapeLabel(shape: Shape) {
    let x = 0,
      y = 0;

    if (shape.mode === 'square' && shape.points) {
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
    this.ctx.font = `bold 14px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(shape.name!, x, y);
  }

  private drawShape(shape: Shape, fillStyle: string, strokeStyle: string) {
    this.ctx.beginPath();
    if (shape.mode === 'square' && shape.points?.length) {
      const first = this.toCanvasCoords(shape.points[0].x, shape.points[0].y);
      this.ctx.moveTo(first.x, first.y);

      for (let i = 1; i < shape.points.length; i++) {
        const p = this.toCanvasCoords(shape.points[i].x, shape.points[i].y);
        this.ctx.lineTo(p.x, p.y);
      }
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
  private quaternionToYawFixed(
    qx: number,
    qy: number,
    qz: number,
    qw: number
  ): number {
    // Convert quaternion to Euler (yaw) in radians
    const siny_cosp = 2 * (qw * qz + qx * qy);
    const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
    let yaw = Math.atan2(siny_cosp, cosy_cosp);
    // Flip for canvas Y-down
    yaw = -yaw;

    // Adjust if your marker faces up by default
    yaw += Math.PI / 2;

    return yaw;
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
    // center image
    this.offsetX = (canvas.clientWidth - cssWidth) / 2;
    this.offsetY = (canvas.clientHeight - cssHeight) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.drawImage(img, this.offsetX, this.offsetY, cssWidth, cssHeight);
  }

  private scaleCoords(x: number, y: number): { x: number; y: number } {
    const scale = 23.51; // scale from backend map to current map
    return {
      x: x * scale,
      y: y * scale,
    };
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
  private quaternionIntensity(qx: number, qy: number, qz: number, qw: number) {
    const dq = {
      qw: Math.abs(qw - this.lastQ.qw),
      qx: Math.abs(qx - this.lastQ.qx),
      qy: Math.abs(qy - this.lastQ.qy),
      qz: Math.abs(qz - this.lastQ.qz),
    };
    // Save last quaternion
    this.lastQ = { qw, qx, qy, qz };

    // "intensity" is the magnitude of change
    return Math.sqrt(
      dq.qw * dq.qw + dq.qx * dq.qx + dq.qy * dq.qy + dq.qz * dq.qz
    );
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
    const visibleRange = range * this.scale * 2;

    // ---- FOV cone (as-is) ----
    if (this.toggleAura) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, visibleRange);
      gradient.addColorStop(0, 'rgba(0, 128, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 128, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(
        x,
        y,
        visibleRange,
        yawRad - fovRad / 2,
        yawRad + fovRad / 2,
        false
      );
      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // ---- Direction arrow/line ----
    const arrowLength = 20; // Adjust as needed
    const arrowX = x + Math.cos(yawRad) * arrowLength;
    const arrowY = y + Math.sin(yawRad) * arrowLength;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(arrowX, arrowY);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Optional: draw arrowhead
    const headLength = 6;
    const angle = yawRad;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - headLength * Math.cos(angle - Math.PI / 6),
      arrowY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      arrowX - headLength * Math.cos(angle + Math.PI / 6),
      arrowY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.lineTo(arrowX, arrowY);
    ctx.fillStyle = 'black ';
    ctx.fill();
  }

  private drawPedestrians() {
    if (!this.pedestrians || this.pedestrians.length === 0) return;
    if (this.togglePadestrian) {
      const ctx = this.ctx!;
      const size = 10;
      for (const p of this.pedestrians) {
        const { x, y } = this.toCanvasCoords(p.x, p.y); // <-- transform coordinates
        ctx.beginPath();
        ctx.arc(x, y - size / 2, size / 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'green';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        // body
        ctx.beginPath();
        ctx.moveTo(x, y - size / 4);
        ctx.lineTo(x, y + size / 2);
        ctx.stroke();

        // arms
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y);
        ctx.lineTo(x + size / 2, y);
        ctx.stroke();

        // legs
        ctx.beginPath();
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x - size / 3, y + size);
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size / 3, y + size);
        ctx.stroke();
      }
    }
  }

  private drawRobotPath() {
    if (!this.showPath || this.robotPath.length < 2) return;
    const ctx = this.ctx!;
    ctx.beginPath();
    const first = this.toCanvasCoords(this.robotPath[0].x, this.robotPath[0].y);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < this.robotPath.length; i++) {
      const pt = this.toCanvasCoords(this.robotPath[i].x, this.robotPath[i].y);
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = '#ff8c1a'; // orange color similar to your image
    ctx.lineWidth = 1.5; // thinner line
    ctx.lineJoin = 'round'; // smoother corners
    ctx.lineCap = 'round'; // rounded path ends
    ctx.globalAlpha = 0.9; // slight transparency like in the screenshot
    ctx.stroke();
  }
  // Add this property to your class
  private calculateSpeed(
    robotId: string,
    x: number,
    y: number,
    timestamp: string
  ): number | null {
    const currentTime = new Date(timestamp).getTime();
    const last = this.lastRobotPositions[robotId];

    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const distance = Math.sqrt(dx * dx + dy * dy); // in meters (assuming map uses meters)
      const dt = (currentTime - last.timestamp) / 1000; // seconds

      if (dt > 0) {
        const speed = distance / dt; // meters/second
        this.lastRobotPositions[robotId] = { x, y, timestamp: currentTime };
        return speed;
      }
    }

    // store current if first time
    this.lastRobotPositions[robotId] = { x, y, timestamp: currentTime };
    return null;
  }
  private drawRobots() {
    if (!this.robots || this.robots.length === 0) return;

    const ctx = this.ctx!;
    const radius = 6;
    const geofences = this.getStoredGeofences();
    const hasRecentViolation = (
      fenceData: any,
      type: string,
      intervalMs: number = 10000
    ) => {
      const violationsOfType = fenceData.violations.filter(
        (v: any) => v.type === type
      );
      if (violationsOfType.length === 0) return false;
      const last = violationsOfType[violationsOfType.length - 1];
      return Date.now() - new Date(last.time).getTime() < intervalMs;
    };

    for (const r of this.robots) {
      const { x, y } = this.toCanvasCoords(r.x, r.y);
      const robotId = r.id;
      const timeStamp = new Date(r.timestamp).toISOString();

      // Detect which fence robot is in
      let insideFence: {
        color: string;
        name: string;
        isRestricted?: boolean;
        speedLimit?: number;
        minSpeed?: number;
        maxSpeed?: number;
        timeLimitMinutes?: number;
      } | null = null;

      for (const gf of geofences) {
        const point = { x: r.x, y: r.y };
        let inFence = false;

        if (gf.mode === 'square')
          inFence = this.isPointInPolygon(point, gf.points);
        else if (gf.mode === 'free' && gf.points?.length > 2)
          inFence = this.isPointInPolygon(point, gf.points);
        else if (gf.points?.length > 2)
          inFence = this.isPointInPolygon(point, gf.points);

        if (inFence) {
          insideFence = {
            color: gf.color || 'red',
            name: gf.name || 'Unnamed Fence',
            isRestricted: gf.isRestricted || false,
            minSpeed: gf.minSpeed,
            maxSpeed: gf.maxSpeed,
            speedLimit: gf.speedLimit,
            timeLimitMinutes: gf.timeLimitMinutes,
          };
          break;
        }
      }

      const currentFence = insideFence?.name || null;
      const previousFence = this.lastFenceState[robotId] || null;
      // --- EXIT logic ---
      if (previousFence && previousFence !== currentFence) {
        const fenceData = this.combinedTracking[robotId]?.[previousFence];
        const lastSession =
          fenceData?.sessions?.[fenceData.sessions.length - 1];

        if (lastSession && !lastSession.exitTime) {
          lastSession.exitTime = timeStamp;
          const entry = new Date(lastSession.entryTime).getTime();
          const exit = new Date(timeStamp).getTime();
          const sessionMinutes = (exit - entry) / 60000;

          lastSession.durationMinutes = +sessionMinutes.toFixed(2);
          fenceData.totalDwellMinutes = +(
            (fenceData.totalDwellMinutes || 0) + sessionMinutes
          ).toFixed(2);

          console.log(
            `🚪 Robot ${robotId} exited ${previousFence} after ${lastSession.durationMinutes} min (total dwell: ${fenceData.totalDwellMinutes} min)`
          );
        }
      }

      // --- ENTRY logic ---
      if (currentFence && previousFence !== currentFence) {
        if (!this.combinedTracking[robotId])
          this.combinedTracking[robotId] = {};

        if (!this.combinedTracking[robotId][currentFence]) {
          // First ever entry
          this.combinedTracking[robotId][currentFence] = {
            sessions: [],
            totalDwellMinutes: 0,
            violations: [],
          };
        }

        // Always push a new session
        this.combinedTracking[robotId][currentFence].sessions.push({
          entryTime: timeStamp,
          exitTime: null,
          durationMinutes: null,
        });
      }

      // --- Restricted zone logic ---
      if (insideFence?.isRestricted) {
        this.drawRestrictedRobot(ctx, x, y, radius, insideFence.color);
        if (
          !this.restrictedToastShown[robotId] ||
          previousFence !== currentFence
        ) {
          this.toastService.addNotification({
            title: 'Restricted Zone Alert',
            message: `🚫 Robot ${r.name || robotId} entered restricted fence: ${
              insideFence.name
            }`,
            className: 'error',
            robotId,
          });

          const fenceData = this.combinedTracking[robotId][insideFence.name];
          fenceData.violations.push({
            type: 'restricted-entry',
            time: timeStamp,
          });

          this.restrictedToastShown[robotId] = true;
          // Reminder every 10s
          if (this.restrictedReminderTimers[robotId]) {
            clearInterval(this.restrictedReminderTimers[robotId]);
          }
          this.restrictedReminderTimers[robotId] = setInterval(() => {
            if (this.lastFenceState[robotId] === insideFence!.name) {
              this.toastService.addNotification({
                title: 'Reminder',
                message: `⚠️ Robot ${
                  r.name || robotId
                } is still inside restricted fence: ${insideFence!.name}`,
                className: 'warning',
                robotId,
              });
            }
          }, 10000);
        }
        this.lastFenceState[robotId] = insideFence.name;
        this.saveCombinedData();
        // continue;
      } else {
        if (this.restrictedReminderTimers[robotId]) {
          clearInterval(this.restrictedReminderTimers[robotId]);
          delete this.restrictedReminderTimers[robotId];
        }
        this.restrictedToastShown[robotId] = false;
      }
      //  Time-based stay violation ---
      if (insideFence) {
        const fenceData = this.combinedTracking[robotId]?.[insideFence.name];
        const lastSession =
          fenceData?.sessions?.[fenceData.sessions.length - 1];
        if (lastSession && !lastSession.exitTime) {
          const entryTime = new Date(lastSession.entryTime).getTime();
          const currentRobotTime = new Date(r.timestamp).getTime();
          let minutesInside = (currentRobotTime - entryTime) / 60000;

          // Fallback and clamp
          if (isNaN(minutesInside) || minutesInside < 0) {
            minutesInside = (Date.now() - entryTime) / 60000;
          }
          minutesInside = Math.max(0, minutesInside);
          const allowedDuration = insideFence.timeLimitMinutes || 2;
          console.log('Minutes Inside', minutesInside);
          console.log('allow Duration', allowedDuration);
          if (minutesInside > allowedDuration) {
            if (!hasRecentViolation(fenceData, 'time-violation')) {
              this.toastService.addNotification({
                title: 'Duration Violation',
                message: `⏱️ Robot ${r.name || robotId} has been inside ${
                  insideFence.name
                } for ${minutesInside.toFixed(1)} minutes .`,
                className: 'duration',
                robotId,
              });

              fenceData.violations.push({
                type: 'time-violation',
                limitMinutes: insideFence.timeLimitMinutes,
                actualMinutes: +minutesInside.toFixed(2),
                time: new Date().toISOString(),
              });

              this.saveCombinedData();
            }
          }
        }
      }
      const calculatedSpeed = this.calculateSpeed(
        robotId,
        r.x,
        r.y,
        r.timestamp
      );
      if (calculatedSpeed !== null) {
        r.speed = calculatedSpeed; // assign for later use
      }
      // --- 🚨 Speed violation detection (Min & Max) ---
      if (insideFence && r.speed != null) {
        const fenceData = this.combinedTracking[robotId]?.[insideFence.name];
        if (fenceData) {
          const now = Date.now();
          const lastViolation =
            fenceData.violations[fenceData.violations.length - 1];

          // Check for MAX speed violation
          if (insideFence.maxSpeed && r.speed > insideFence.maxSpeed) {
            if (!hasRecentViolation(fenceData, 'max-speed-violation')) {
              this.toastService.addNotification({
                title: '🚨 Overspeed Violation',
                message: `Robot ${
                  r.name || robotId
                } exceeded maximum speed in ${
                  insideFence.name
                }: ${r.speed.toFixed(2)} > ${insideFence.maxSpeed} m/s`,
                className: 'error',
                robotId,
              });

              fenceData.violations.push({
                type: 'max-speed-violation',
                actualSpeed: +r.speed.toFixed(2),
                limit: insideFence.maxSpeed,
                time: new Date().toISOString(),
              });
              this.saveCombinedData();
            }
          }

          // Check for MIN speed violation
          if (insideFence.minSpeed && r.speed < insideFence.minSpeed) {
            if (!hasRecentViolation(fenceData, 'min-speed-violation')) {
              this.toastService.addNotification({
                title: '⚠️ Low Speed Violation',
                message: `Robot ${r.name || robotId} is moving too slow in ${
                  insideFence.name
                }: ${r.speed.toFixed(2)} < ${insideFence.minSpeed} m/s`,
                className: 'warning',
                robotId,
              });

              fenceData.violations.push({
                type: 'min-speed-violation',
                actualSpeed: +r.speed.toFixed(2),
                limit: insideFence.minSpeed,
                time: new Date().toISOString(),
              });

              this.saveCombinedData();
            }
          }
        }
      }

      // --- Draw robot normally ---
      this.drawNormalRobot(ctx, x, y, radius, insideFence);
      this.lastFenceState[robotId] = currentFence;
      this.saveCombinedData();

      const { yaw } = this.quaternionToEuler(r.qx, r.qy, r.qz, r.qw);
      const canvasYaw = -yaw;
      this.drawCameraFOV(ctx, x, y, canvasYaw, 120, 100);
    }
  }

  private drawRestrictedRobot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color || 'rgba(255,0,0,0.6)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.stroke();
    for (const r of this.robots) {
      const { yaw } = this.quaternionToEuler(r.qx, r.qy, r.qz, r.qw);
      const canvasYaw = -yaw;
      this.drawCameraFOV(ctx, x, y, canvasYaw, 120, 100);
    }
  }

  private drawNormalRobot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    insideFence: any
  ) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = insideFence ? insideFence.color : 'red';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.stroke();

    if (insideFence && !insideFence.isRestricted) {
      ctx.font = '12px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.fillText(insideFence.name, x, y - radius - 5);
    }
    for (const r of this.robots) {
      const { yaw } = this.quaternionToEuler(r.qx, r.qy, r.qz, r.qw);
      const canvasYaw = -yaw;
      this.drawCameraFOV(ctx, x, y, canvasYaw, 120, 100);
    }
  }
  private isPointInSquare(
    point: { x: number; y: number },
    square: { startX: number; startY: number; endX: number; endY: number }
  ): boolean {
    return (
      point.x >= Math.min(square.startX, square.endX) &&
      point.x <= Math.max(square.startX, square.endX) &&
      point.y >= Math.min(square.startY, square.endY) &&
      point.y <= Math.max(square.startY, square.endY)
    );
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
    // this.clampOffsets();
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
