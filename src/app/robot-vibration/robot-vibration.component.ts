import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { LocalmapService } from '../services/localmap.service';

@Component({
  selector: 'app-robot-vibration',
  templateUrl: './robot-vibration.component.html',
})
export class RobotVibrationComponent implements OnInit {
  public vibrationData: ChartConfiguration<'line'>['data'] = {
    datasets: [
      {
        label: 'Vibration Intensity',
        data: [] as { x: number; y: number }[],
        borderColor: 'rgba(0, 200, 0, 0.8)',
        borderWidth: 1,
        pointRadius: 0,
        fill: true,
        backgroundColor: 'rgba(0, 200, 0, 0.2)',
        tension: 0.3,
      },
    ],
  };

  public chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
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

  // ✅ Class properties
  private prevQuat: { qx: number; qy: number; qz: number; qw: number } | null =
    null;
  private prevPos: { x: number; y: number; z: number } | null = null;

  constructor(private localMapService: LocalmapService) {}

  ngOnInit() {
    this.localMapService.getRobotLocation().subscribe((robot) => {
      const time = Date.now();
      let vibration = 0;

      if (this.prevQuat && this.prevPos) {
        // Rotation intensity
        const dw = robot.qw - this.prevQuat.qw;
        const dxq = robot.qx - this.prevQuat.qx;
        const dyq = robot.qy - this.prevQuat.qy;
        const dzq = robot.qz - this.prevQuat.qz;
        const rotIntensity = Math.sqrt(
          dw * dw + dxq * dxq + dyq * dyq + dzq * dzq
        );

        // Linear intensity
        const dx = robot.x - this.prevPos.x;
        const dy = robot.y - this.prevPos.y;
        const dz = robot.z - this.prevPos.z;
        const linIntensity = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Filter tiny noise
        const ROT_THRESHOLD = 0.0005;
        const LIN_THRESHOLD = 0.001;
        const filteredRotIntensity =
          rotIntensity > ROT_THRESHOLD ? rotIntensity : 0;
        const filteredLinIntensity =
          linIntensity > LIN_THRESHOLD ? linIntensity : 0;

        vibration = (filteredRotIntensity + filteredLinIntensity) * 100;
      }

      // Add to chart
      let data = [...(this.vibrationData.datasets[0].data as any)];
      data.push({ x: time, y: vibration });
      if (data.length > 200) data = data.slice(-200);

      this.vibrationData = {
        ...this.vibrationData,
        datasets: [{ ...this.vibrationData.datasets[0], data }],
      };

      // Update previous values
      this.prevQuat = {
        qx: robot.qx,
        qy: robot.qy,
        qz: robot.qz,
        qw: robot.qw,
      };
      this.prevPos = { x: robot.x, y: robot.y, z: robot.z };
    });
  }
}
