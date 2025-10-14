import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { LocalmapService } from '../../_services/localmap.service';

@Component({
  selector: 'app-robot',
  templateUrl: './robot.component.html',
  styleUrls: ['./robot.component.scss'],
})
export class RobotComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private robotSub?: Subscription;
  private pedestrianSub?: Subscription;
  private subs: Subscription[] = [];
  mapWidth = 800; // set according to your map image
  mapHeight = 600;
  pedestrian: any;
  robot: any;

  constructor(
    private mapService: LocalmapService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    //robot
    // this.mapService.connect();

    // Start only filters needed for this component
    this.mapService.startFilters(['ObjectDetections']);

    this.subs.push(
      this.mapService.getRobotLocation().subscribe((data) => {
        this.robot = data;
        this.cdr.markForCheck();
      })
    );

    this.subs.push(
      this.mapService.getPedestrians().subscribe((data) => {
        this.pedestrian = data;
        console.log('👣 Pedestrians from RobotComponent:', data);
        this.cdr.markForCheck();
      })
    );
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // Set canvas resolution
    canvas.width = this.mapWidth;
    canvas.height = this.mapHeight;

    // Start animation loop
    this.startLoop();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.mapService.stopFilters(['FullPose', 'ObjectDetections']);
  }

  private startLoop() {
    const loop = () => {
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Clear background
    ctx.clearRect(0, 0, this.mapWidth, this.mapHeight);

    // Draw robot if available
    if (this.robot) {
      this.drawRobot(ctx, this.robot);
      this.drawPedestrians(ctx);
    }
  }

  private drawRobot(ctx: CanvasRenderingContext2D, robot: any) {
    const scale = 23.51; // px per meter

    // Robot coords (origin bottom-left)
    const px = this.mapWidth / 2;
    const py = this.mapHeight / 2;

    // --- Draw robot (blue dot) ---
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // --- Heading angle from quaternion ---
    const yaw = this.quaternionToYaw(robot.qw, robot.qx, robot.qy, robot.qz);
    // this.drawCameraFOV(ctx, px, py, yaw, 120, 100);

    // --- Draw detection aura (blue cone) ---
    const halfAngle = (60 * Math.PI) / 180; // 60° cone
    const auraRadius = 8 * scale; // aura same as outer circle

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, auraRadius, -yaw - halfAngle, -yaw + halfAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,255,0.2)';
    ctx.fill();

    // --- Heading arrow ---
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 20 * Math.cos(yaw), py - 20 * Math.sin(yaw));
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Concentric circles ---
    this.drawCircle(
      ctx,
      px,
      py,
      2 * scale,
      'rgba(255,0,0,0.2)',
      'rgba(255,0,0,0.8)'
    );
    this.drawCircle(
      ctx,
      px,
      py,
      5 * scale,
      'rgba(255,255,0,0.2)',
      'rgba(255,165,0,0.8)'
    );
    this.drawCircle(
      ctx,
      px,
      py,
      8 * scale,
      'rgba(0,255,0,0.2)',
      'rgba(0,255,0,0.8)'
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

    // This is the range of the FOV
    const visibleRange = range * 2;

    // Calculate the left and right edge points of the FOV
    const leftX = x + visibleRange * Math.cos(yaw - fovRad / 2);
    const leftY = y + visibleRange * Math.sin(yaw - fovRad / 2);

    const rightX = x + visibleRange * Math.cos(yaw + fovRad / 2);
    const rightY = y + visibleRange * Math.sin(yaw + fovRad / 2);

    // **Drawing the aura:**
    // Draw the aura (arc) with the yaw value centered correctly
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(
      x,
      y,
      visibleRange,
      yaw - fovRad / 2, // Start angle: yaw angle - half FOV
      yaw + fovRad / 2, // End angle: yaw angle + half FOV
      false
    );
    ctx.fillStyle = 'rgba(0, 64, 255, 0.15)'; // softer aura
    ctx.fill();

    // Draw boundary of the aura
    ctx.beginPath();
    ctx.arc(x, y, visibleRange, yaw - fovRad / 2, yaw + fovRad / 2, false);
    ctx.strokeStyle = 'darkgreen';
    ctx.lineWidth = 2;
    // ctx.stroke(); // Uncomment if you want the border drawn

    // Optionally, draw left and right edge rays
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(leftX, leftY);
    ctx.moveTo(x, y);
    ctx.lineTo(rightX, rightY);
    // ctx.stroke(); // Uncomment if you want edge rays drawn
  }

  private drawCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    fillColor: string,
    strokeColor: string
  ) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private quaternionToYaw(
    qw: number,
    qx: number,
    qy: number,
    qz: number
  ): number {
    const yaw = Math.atan2(
      2.0 * (qw * qz + qx * qy),
      1.0 - 2.0 * (qy * qy + qz * qz)
    );
    const siny_cosp = 2 * (qw * qz + qx * qy);
    const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
    return Math.atan2(siny_cosp, cosy_cosp);
  }

  private drawPedestrians(ctx: CanvasRenderingContext2D) {
    if (!this.pedestrian?.length || !this.robot) return;

    const centerX = this.mapWidth / 2;
    const centerY = this.mapHeight / 2;
    const scale = 23.51; // px per meter

    this.pedestrian.forEach((ped: any) => {
      if (ped.world_location !== null) {
        const px = (ped.world_location.x - this.robot.x) * scale + centerX;
        const py = centerY - (ped.world_location.y - this.robot.y) * scale; // invert Y

        const dist = Math.hypot(px - centerX, py - centerY);

        let color = 'green';
        if (dist <= 2 * scale) color = 'red';
        else if (dist <= 5 * scale) color = 'yellow';
        // console.log('Pedestrian drawn', ped);
        // console.log({ px, py, centerX, centerY, pedX: ped.x, pedY: ped.y });

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}
