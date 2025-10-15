import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { Subscription } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { LocalmapService } from '../../_services/localmap.service';

@Component({
  selector: 'app-robot-speed',
  templateUrl: './robot-speed.component.html',
  styleUrls: ['./robot-speed.component.scss'],
})
export class RobotSpeedComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  private prevQuat: any = null;
  private prevPos: any = null;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public speedData: ChartConfiguration<'line'>['data'] = {
    datasets: [
      {
        label: 'Linear Speed',
        data: [],
        borderColor: 'rgba(0, 123, 255, 0.9)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Rotational Speed',
        data: [],
        borderColor: 'rgba(255, 193, 7, 0.9)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  public chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'second',
          displayFormats: {
            second: 'HH:mm:ss',
          },
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Speed',
        },
        min: 0,
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  constructor(
    private localMapService: LocalmapService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.localMapService.startFilters(['FullPose']);

    this.subs.push(
      this.localMapService.getRobotLocation().subscribe((robot) => {
        const time = Date.now();

        let linSpeed = 0;
        let rotSpeed = 0;

        if (robot && this.prevQuat && this.prevPos) {
          // Rotation speed
          const dw = robot.qw - this.prevQuat.qw;
          const dxq = robot.qx - this.prevQuat.qx;
          const dyq = robot.qy - this.prevQuat.qy;
          const dzq = robot.qz - this.prevQuat.qz;
          rotSpeed = Math.sqrt(dw * dw + dxq * dxq + dyq * dyq + dzq * dzq);

          // Linear speed
          const dx = robot.x - this.prevPos.x;
          const dy = robot.y - this.prevPos.y;
          const dz = robot.z - this.prevPos.z;
          linSpeed = Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        // Save robot pose for next time
        this.prevQuat = {
          qx: robot.qx,
          qy: robot.qy,
          qz: robot.qz,
          qw: robot.qw,
        };
        this.prevPos = {
          x: robot.x,
          y: robot.y,
          z: robot.z,
        };

        // Push to chart data
        const linearData = [...(this.speedData.datasets[0].data as any)];
        const rotationalData = [...(this.speedData.datasets[1].data as any)];

        linearData.push({ x: time, y: linSpeed });
        rotationalData.push({ x: time, y: rotSpeed });

        this.speedData.datasets[0].data = linearData.slice(-200);
        this.speedData.datasets[1].data = rotationalData.slice(-200);

        // Trigger chart update
        this.chart?.update();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.localMapService.stopFilters(['FullPose']);
  }
}
