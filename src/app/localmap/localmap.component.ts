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
  isDrawingShape = false;
  private fittedScale = 1;
  polygons: Shape[] = [];
  currentPolygon: { x: number; y: number }[] = [];
  shapeMode: 'free' | 'square' | null = null;
  currentShape: Shape | null = null;
  circleRadius: number = 100;
  squareSize: number = 140;
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
  private readonly HANDLE_TOLERANCE = 20;
  restrictionPoints: { id: string; x: number; y: number }[] = [];
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
  robots: any[] = [];
  gridEnabled = false;
  gridSize = 10;
  lastFences: { [robotId: number]: string | null } = {};
  fenceLog: { robot: string; fenceName: string; time: Date }[] = [];
  robotList: any = [];
  localisationStatus: string = '';
  pendingTool: any = null;
  private skipNextMouseUp = false;
  constructor(
    private localMapService: LocalmapService,
    private mapStorage: MapStorageService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private router: Router
  ) {}
  private shapeToCopy: Shape | null = null;
  addingGeofence: boolean = false;
  selectedColor: string = '#ff0000'; // default
  colors = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#000000',
    '#008080',
    '#FFFFFF',
    '#f37934',
    '#b8312f',
    '#ffb7ce',
    '#dfc5fe',
    '#8b48d2',
    '#257623ff',
    '#c3c327ff',
  ];
  copyMode: boolean = false;
  copiedShapeTemplate: Shape | null = null;
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
  selectShape(mode: 'free' | 'square') {
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
      const scaled = this.scaleCoords(robot.x, robot.y);
      robot.x = scaled.x;
      robot.y = scaled.y;

      if (this.showPath) {
        this.robotPath.push({ x: robot.x, y: robot.y });
      }
      const idx = this.robots.findIndex((r) => r.id === robot.id);
      if (idx >= 0) {
        this.robots[idx] = robot;
      } else {
        this.robots.push(robot);
      }
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
      shapeMode: [null, Validators.required],
      // circleRadius: [3, Validators.required],
      squareSize: [200, Validators.required],
      // triangleBase: [2, Validators.required],
      // triangleHeight: [1, Validators.required],
      color: ['#ff0000', Validators.required],
      isDrag: [true],
      isResize: [true],
    });
  }
  private isImageFitted(): boolean {
    return this.scale === this.fittedScale;
  }
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Delete' || event.key === 'Del') {
      this.deleteSelectedFence();
    }
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
        this.pendingTool = this.mapForm.value;
        this.gridEnabled = true; // <--- ENABLE GRID HERE
      }

      modal.close();
      this.redraw(); // redraw immediately to show grid
    } else {
      console.log('Form not valid');
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
    canvas.addEventListener('resize', () => {
      this.fitImageToCanvas();
      this.redraw();
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        // Left click drag
        console.log('image1', this.isImageFitted());
        if (!this.isImageFitted()) {
          // Only allow drag if zoomed in
          this.isPanning = true;
          this.dragStart = {
            x: event.clientX - this.offsetX,
            y: event.clientY - this.offsetY,
          };
          canvas.style.cursor = 'grabbing';
        } else {
          // If fitted, disable drag
          this.isPanning = false;
          canvas.style.cursor = 'default';
        }
      }
    });

    // Mouse move → pan map if right button held
    window.addEventListener('mousemove', (event) => {
      console.log('image', this.isImageFitted());
      if (this.isPanning && !this.isImageFitted()) {
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

    // CSS/canvas coordinates
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    // convert to image pixel coordinates
    let imgX = (cssX - this.offsetX) / this.scale;
    let imgY = (cssY - this.offsetY) / this.scale;

    // reverse Y axis so top-left = (0,0)
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

    // reverse Y axis
    imgY = this.mapImage.nativeElement.naturalHeight - imgY;

    return { x: imgX, y: imgY };
  }

  private toCanvasCoords(imgX: number, imgY: number) {
    // reverse Y axis for canvas rendering
    const canvasX = imgX * this.scale + this.offsetX;
    const canvasY =
      (this.mapImage.nativeElement.naturalHeight - imgY) * this.scale +
      this.offsetY;

    return { x: canvasX, y: canvasY };
  }
  private normalizeSquare(shape: Shape) {
    // console.log('shape', shape);
    if (shape.mode !== 'square') return;

    const minX = Math.min(shape.startX!, shape.endX!);
    const maxX = Math.max(shape.startX!, shape.endX!);
    const minY = Math.min(shape.startY!, shape.endY!);
    const maxY = Math.max(shape.startY!, shape.endY!);

    shape.startX = minX;
    shape.startY = minY;
    shape.endX = maxX;
    shape.endY = maxY;
  }
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (event.target !== this.mapCanvas.nativeElement) return;
    const { x, y } = this.getTransformedCoords(event);
    const mouseCanvas = this.toCanvasCoords(x, y);
    let foundHover = false;
    if (this.isPanning && !this.isImageFitted()) {
      this.offsetX = event.clientX - this.dragStart.x;
      this.offsetY = event.clientY - this.dragStart.y;
      this.redraw();
      return; // skip shape hover / dragging logic
    }

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

      // if (proposedShape.mode === 'circle') {
      //   const dx = x - proposedShape.startX!;
      //   const dy = y - proposedShape.startY!;
      //   proposedShape.radius = Math.hypot(dx, dy);
      //   proposedShape.endX = x;
      //   proposedShape.endY = y;
      // } else
      if (proposedShape.mode === 'square') {
        // Opposite corner (the one not being dragged)
        let fixedX: number;
        let fixedY: number;

        switch (this.activeHandleIndex) {
          case 3: // top-left
            fixedX = this.resizingShape.endX!;
            fixedY = this.resizingShape.endY!;
            break;
          case 2: // top-right
            fixedX = this.resizingShape.startX!;
            fixedY = this.resizingShape.endY!;
            break;
          case 1: // bottom-right
            fixedX = this.resizingShape.startX!;
            fixedY = this.resizingShape.startY!;
            break;
          case 0: // bottom-left
            fixedX = this.resizingShape.endX!;
            fixedY = this.resizingShape.startY!;
            break;
          default:
            return;
        }

        // dx, dy relative to opposite corner
        const dx = x - fixedX;
        const dy = y - fixedY;

        // enforce square by using max of dx/dy
        const size = Math.max(Math.abs(dx), Math.abs(dy));

        // assign new coords depending on handle
        switch (this.activeHandleIndex) {
          case 3: // top-left
            proposedShape.startX = fixedX - size;
            proposedShape.startY = fixedY - size;
            proposedShape.endX = fixedX;
            proposedShape.endY = fixedY;
            break;
          case 2: // top-right
            proposedShape.startX = fixedX;
            proposedShape.startY = fixedY - size;
            proposedShape.endX = fixedX + size;
            proposedShape.endY = fixedY;
            break;
          case 1: // bottom-right
            proposedShape.startX = fixedX;
            proposedShape.startY = fixedY;
            proposedShape.endX = fixedX + size;
            proposedShape.endY = fixedY + size;
            break;
          case 0: // bottom-left
            proposedShape.startX = fixedX - size;
            proposedShape.startY = fixedY;
            proposedShape.endX = fixedX;
            proposedShape.endY = fixedY + size;
            break;
        }
      }
      //  else if (proposedShape.mode === 'triangle') {
      //   switch (this.activeHandleIndex) {
      //     case 0: // bottom-left
      //       proposedShape.startX = x;
      //       proposedShape.startY = y;
      //       proposedShape.endX = this.originalPoints[1].x;
      //       proposedShape.endY = this.originalPoints[1].y;
      //       proposedShape.topX = this.originalPoints[2].x;
      //       proposedShape.topY = this.originalPoints[2].y;
      //       break;
      //     case 1: // bottom-right
      //       proposedShape.endX = x;
      //       proposedShape.endY = y;
      //       proposedShape.startX = this.originalPoints[0].x;
      //       proposedShape.startY = this.originalPoints[0].y;
      //       proposedShape.topX = this.originalPoints[2].x;
      //       proposedShape.topY = this.originalPoints[2].y;
      //       break;
      //     case 2: // top
      //       proposedShape.topX = x;
      //       proposedShape.topY = y;
      //       proposedShape.startX = this.originalPoints[0].x;
      //       proposedShape.startY = this.originalPoints[0].y;
      //       proposedShape.endX = this.originalPoints[1].x;
      //       proposedShape.endY = this.originalPoints[1].y;
      //       break;
      //   }
      // }ss
      else if (proposedShape.mode === 'free' && proposedShape.points) {
        proposedShape.points[this.activeHandleIndex] = { x, y };
      }

      const idx = this.polygons.indexOf(this.resizingShape);
      if (!this.doesShapeOverlap(proposedShape, idx)) {
        Object.assign(this.resizingShape, proposedShape);
        this.normalizeSquare(this.resizingShape);
      }
      this.redraw();
      return;
    }
    if (this.draggingShape) {
      if (event.buttons !== 1) {
        // mouse released but we never got proper mouseup
        this.draggingShape = null;
        this.resizingShape = null;
        this.activeHandleIndex = null;
        this.originalPoints = [];
        // this.mapCanvas.nativeElement.style.cursor = 'default';
        return;
      }
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
    };
    console.log('overlap', this.doesShapeOverlap(newShape));
    if (!this.doesShapeOverlap(newShape)) {
      console.log('callled ');
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
    if (event.button !== 0) {
      if (!this.isImageFitted()) {
        this.isPanning = true;
        this.dragStart = {
          x: event.clientX - this.offsetX,
          y: event.clientY - this.offsetY,
        };
        this.mapCanvas.nativeElement.style.cursor = 'grabbing';
      } else {
        this.isPanning = false;
        this.mapCanvas.nativeElement.style.cursor = 'default';
      }
    }
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
      // Step 1: no template yet → select shape
      if (!this.copiedShapeTemplate) {
        for (let i = this.polygons.length - 1; i >= 0; i--) {
          if (this.isPointInShape({ x, y }, this.polygons[i])) {
            // deep clone template
            this.copiedShapeTemplate = JSON.parse(
              JSON.stringify(this.polygons[i])
            );
            alert('Now click on canvas to place the copy.');
            return;
          }
        }
      }
      // Step 2: template exists → place copy
      else {
        const newShape: Shape = JSON.parse(
          JSON.stringify(this.copiedShapeTemplate)
        );

        // offset/relocate so it appears at click position
        const dx = x - newShape.startX!;
        const dy = y - newShape.startY!;
        if (newShape.mode === 'free' && newShape.points) {
          newShape.points = newShape.points.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
        } else {
          newShape.startX! += dx;
          newShape.startY! += dy;
          newShape.endX! += dx;
          newShape.endY! += dy;
        }

        // --- ✅ Overlap check ---
        if (this.doesShapeOverlap(newShape)) {
          alert('Cannot place copy: it overlaps with an existing shape.');
          this.copyMode = false;
          this.copiedShapeTemplate = null;
          return;
        }
        if (this.copiedShapeTemplate.name) {
          const baseName = this.copiedShapeTemplate.name.replace(/\s+\d+$/, ''); // remove any existing number at end
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
        // --- place shape ---
        this.polygons.push(newShape);
        // localStorage.setItem('')
        localStorage.setItem('geoFences', JSON.stringify(this.polygons));
        this.copyMode = false;
        this.copiedShapeTemplate = null;
        this.redraw();
        return;
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
        } else if (this.hoveredShape.mode === 'square') {
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
    this.drawGrid();
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
        this.currentPolygon = [];
      }
      this.currentPolygon.push({ x, y });
      this.isDrawingShape = true;
      this.redraw();
      return;
    }
    this.currentShape = {
      mode: this.shapeMode,
      startX: snappedX,
      startY: snappedY,
      endX: snappedX + 50, // default size
      endY: snappedY + 50,
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
    if (shape.mode === 'square') {
      const topLeft = this.toCanvasCoords(shape.startX!, shape.startY!);
      const bottomRight = this.toCanvasCoords(shape.endX!, shape.endY!);
      this.ctx.rect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );
    }
    //  else if (shape.mode === 'triangle') {
    //   const p1 = this.toCanvasCoords(shape.startX!, shape.startY!);
    //   const p2 = this.toCanvasCoords(shape.endX!, shape.endY!);
    //   const midX = shape.startX! * 2 - shape.endX!;
    //   const midY = shape.endY!;
    //   const p3 = this.toCanvasCoords(midX, midY);

    //   this.ctx.moveTo(p1.x, p1.y);
    //   this.ctx.lineTo(p2.x, p2.y);
    //   this.ctx.lineTo(p3.x, p3.y);
    //   this.ctx.closePath();
    // }
    else if (shape.mode === 'free' && shape.points?.length) {
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

  isNearHandle(shape: Shape | null, mouseCanvas: { x: number; y: number }) {
    if (!shape) return null;
    const tol = 10 * this.scale; // tolerance adjusted for zoom

    // if (shape.mode === 'circle' && shape.radius) {
    //   const center = this.toCanvasCoords(shape.startX!, shape.startY!);
    //   const edge = this.toCanvasCoords(shape.endX!, shape.endY!);
    //   const radius = Math.hypot(edge.x - center.x, edge.y - center.y);

    //   // Handle is on right side of circle
    //   const handle = { x: center.x + radius, y: center.y };

    //   if (
    //     Math.hypot(mouseCanvas.x - handle.x, mouseCanvas.y - handle.y) < tol
    //   ) {
    //     return { kind: 'ew', index: 0 };
    //   }
    // } else
    if (shape.mode === 'square') {
      const corners = this.getShapeCorners(shape);
      for (let i = 0; i < corners.length; i++) {
        const cCanvas = this.toCanvasCoords(corners[i].x, corners[i].y); // ✅ FIX
        if (
          Math.abs(mouseCanvas.x - cCanvas.x) < tol &&
          Math.abs(mouseCanvas.y - cCanvas.y) < tol
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
    // ✅ Handle modal-created tools (pendingTool)
    if (this.pendingTool) {
      const tool = this.pendingTool;
      let newShape: Shape | null = null;

      if (tool.shapeMode === 'square') {
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
        this.gridEnabled = false;
      } else if (tool.shapeMode === 'free') {
        this.shapeMode = 'free';
        this.currentPolygon = [{ x, y }];
        this.isDrawingShape = true;
        this.redraw();
        this.pendingTool = null;
        return;
      }
      if (newShape) {
        if (newShape.mode == 'square') {
          this.normalizeSquare(newShape);
        }
        // 🔴 Duplicate check
        if (this.isDuplicateName(newShape.name)) {
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
      if (this.draggingShape?.mode === 'square') {
        this.normalizeSquare(this.draggingShape);
      }
      const idx = this.polygons.indexOf(this.draggingShape);
      if (this.doesShapeOverlap(this.draggingShape, idx)) {
        this.originalCoordinates();
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
    if (
      this.currentShape.mode === 'square' &&
      this.currentShape.startX === this.currentShape.endX &&
      this.currentShape.startY === this.currentShape.endY
    ) {
      this.currentShape.endX = this.currentShape.startX! + this.squareSize;
      this.currentShape.endY = this.currentShape.startY! + this.squareSize;
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
  private isPointInCircle(
    point: { x: number; y: number },
    circle: { startX: number; startY: number; radius: number }
  ): boolean {
    const dx = point.x - circle.startX;
    const dy = point.y - circle.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= circle.radius;
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
    // if (shape.mode === 'circle' && shape.radius) {
    //   const points: { x: number; y: number }[] = [];
    //   const steps = 24; // higher = smoother circle
    //   for (let i = 0; i < steps; i++) {
    //     const angle = (2 * Math.PI * i) / steps;
    //     points.push({
    //       x: shape.startX! + shape.radius * Math.cos(angle),
    //       y: shape.startY! + shape.radius * Math.sin(angle),
    //     });
    //   }
    //   return points;
    // } else
    if (shape.mode === 'square') {
      return [
        { x: shape.startX!, y: shape.startY! },
        { x: shape.endX!, y: shape.startY! },
        { x: shape.endX!, y: shape.endY! },
        { x: shape.startX!, y: shape.endY! },
      ];
    }
    //  else if (shape.mode === 'triangle') {
    //   return [
    //     { x: shape.startX!, y: shape.startY! },
    //     { x: shape.endX!, y: shape.startY! },
    //     { x: (shape.startX! + shape.endX!) / 2, y: shape.endY! },
    //   ];
    // }
    else if (shape.mode === 'free' && shape.points) {
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

        if (this.isDuplicateName(fenceName, this.selectedFence)) {
          return;
        }

        this.selectedFence!.name = fenceName;
        this.selectedFence!.isDraggable = isDrag;
        this.selectedFence!.isResizable = isResize;
        this.selectedFence!.color = color;
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
        this.shapeMode = null;
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
      const x1 = Math.min(shape.startX!, shape.endX!);
      const y1 = Math.min(shape.startY!, shape.endY!);
      const x2 = Math.max(shape.startX!, shape.endX!);
      const y2 = Math.max(shape.startY!, shape.endY!);

      return [
        { x: x1, y: y1 }, // top-left
        { x: x2, y: y1 }, // top-right
        { x: x2, y: y2 }, // bottom-right
        { x: x1, y: y2 }, // bottom-left
      ];
    } else if (shape.mode === 'triangle') {
      // use explicit vertices
      return [
        { x: shape.startX!, y: shape.startY! }, // bottom-left
        { x: shape.endX!, y: shape.endY! }, // bottom-right
        { x: shape.topX!, y: shape.topY! }, // top
      ];
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
    if (shape.mode === 'square') {
      const topLeft = this.toCanvasCoords(shape.startX!, shape.startY!);
      const bottomRight = this.toCanvasCoords(shape.endX!, shape.endY!);

      this.ctx.rect(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
      );
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
    console.log('window', window.innerWidth);
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    console.log('max width', maxWidth);
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
    console.log('canvas width', canvas.width);
    console.log('canvas height', canvas.height);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    console.log('canvas width fit', canvas.style.width);

    // center image
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
  private scaleCoords(x: number, y: number): { x: number; y: number } {
    const scale = 30; // scale from backend map to current map
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

    const leftX = x + visibleRange * Math.cos(yawRad - fovRad / 2);
    const leftY = y + visibleRange * Math.sin(yawRad - fovRad / 2);

    const rightX = x + visibleRange * Math.cos(yawRad + fovRad / 2);
    const rightY = y + visibleRange * Math.sin(yawRad + fovRad / 2);

    ctx.beginPath();
    ctx.moveTo(x, y);

    // left edge
    ctx.lineTo(leftX, leftY);

    // smooth curve instead of sharp line
    ctx.arc(x, y, visibleRange, yawRad - fovRad / 2, yawRad + fovRad / 2);

    // close back to center
    ctx.closePath();

    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fill();

    ctx.strokeStyle = 'darkgreen';
    ctx.lineWidth = 2;
    ctx.stroke();
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

    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  private drawRobots() {
    if (!this.robots || this.robots.length === 0) return;
    const ctx = this.ctx!;
    const radius = 6;

    const geofences = this.getStoredGeofences();

    for (const r of this.robots) {
      const { x, y } = this.toCanvasCoords(r.x, r.y);
      let insideFence: { color: string; name: string } | null = null; // store color if inside

      for (const gf of geofences) {
        if (gf.mode === 'circle' && gf.radius) {
          if (this.isPointInCircle({ x: r.x, y: r.y }, gf)) {
            insideFence = {
              color: gf.color || 'red',
              name: gf.name || 'Unnamed Fence',
            };
            break;
          }
        } else if (gf.mode === 'square') {
          if (this.isPointInSquare({ x: r.x, y: r.y }, gf)) {
            insideFence = {
              color: gf.color || 'red',
              name: gf.name || 'Unnamed Fence',
            };
            break;
          }
        } else if (gf.mode === 'triangle') {
          if (this.isPointInSquare({ x: r.x, y: r.y }, gf)) {
            insideFence = {
              color: gf.color || 'red',
              name: gf.name || 'Unnamed Fence',
            };
            break;
          }
        } else if (gf.mode === 'free' && gf.points?.length > 2) {
          if (this.isPointInPolygon({ x: r.x, y: r.y }, gf.points)) {
            insideFence = {
              color: gf.color || 'red',
              name: gf.name || 'Unnamed Fence',
            };
            break;
          }
        } else if (gf.points?.length > 2) {
          // fallback: generic polygon
          if (this.isPointInPolygon({ x: r.x, y: r.y }, gf.points)) {
            insideFence = {
              color: gf.color || 'red',
              name: gf.name || 'Unnamed Fence',
            };
            break;
          }
        }
      }

      // draw robot
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = insideFence ? insideFence.color : 'blue';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'black';
      ctx.fill();
      ctx.stroke();
      if (insideFence) {
        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(insideFence.name, x, y - radius - 5); // name above robot
      }
      // draw camera FOV
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

  private isPointInTriangle(
    point: { x: number; y: number },
    tri: { startX: number; startY: number; endX: number; endY: number }
  ): boolean {
    // construct triangle vertices (example: right triangle)
    const p0 = { x: tri.startX, y: tri.startY };
    const p1 = { x: tri.endX, y: tri.startY };
    const p2 = { x: (tri.startX + tri.endX) / 2, y: tri.endY };

    return this.isPointInPolygon(point, [p0, p1, p2]);
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
