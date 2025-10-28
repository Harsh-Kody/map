import { Component } from '@angular/core';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-zone-activity',
  templateUrl: './zone-activity.component.html',
  styleUrls: ['./zone-activity.component.scss'],
})
export class ZoneActivityComponent {
  startDate!: string;
  endDate!: string;
  chart: any;

  ngOnInit() {
    this.getFilteredData();
  }

  applyFilter() {
    const data = this.getFilteredData();
    this.loadChart(data);
  }

  private getFilteredData() {
    const raw = localStorage.getItem('robotFenceData');
    if (!raw) return { labels: [], dwell: [], violations: [] };

    const parsed = JSON.parse(raw);
    const labels: string[] = [];
    const dwell: number[] = [];
    const violations: number[] = [];

    // ✅ Adjust date range
    const start = this.startDate
      ? new Date(this.startDate + 'T00:00:00')
      : new Date('2000-01-01');
    const end = this.endDate
      ? new Date(this.endDate + 'T23:59:59') // include full end day
      : new Date('2100-01-01');

    console.log('Start', start);
    console.log('End', end);
    for (const [zoneName, zoneData] of Object.entries<any>(parsed)) {
      for (const [fenceName, fenceData] of Object.entries<any>(zoneData)) {
        if (!fenceData) continue;

        let totalMinutes = 0;
        let violationCount = 0;

        // ✅ Sessions check
        if (Array.isArray(fenceData.sessions)) {
          fenceData.sessions.forEach((s: any) => {
            const entry = s.entryTime ? new Date(s.entryTime) : null;
            const exit = s.exitTime ? new Date(s.exitTime) : null;
            console.log('EntryTime', entry);
            console.log('Exit', exit);

            // ✅ Include if session overlaps the selected range
            if (
              (entry && entry <= end && (!exit || exit >= start)) ||
              (exit && exit >= start && exit <= end)
            ) {
              totalMinutes += s.durationMinutes || 0;
            }
          });
        }

        // ✅ Violations check
        if (Array.isArray(fenceData.violations)) {
          fenceData.violations.forEach((v: any) => {
            if (!v) return;
            const vt = v.time ? new Date(v.time) : null;
            if (vt && vt >= start && vt <= end) {
              violationCount++;
            }
          });
        }

        if (totalMinutes > 0 || violationCount > 0) {
          labels.push(fenceName);
          dwell.push(Number(totalMinutes.toFixed(2)));
          violations.push(violationCount);
        }
      }
    }

    console.log('✅ Filtered Chart Data:', { labels, dwell, violations });
    return { labels, dwell, violations };
  }

  private loadChart(data: {
    labels: string[];
    dwell: number[];
    violations: number[];
  }) {
    if (this.chart) this.chart.destroy();
    const ctx = document.getElementById('fenceChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Dwell Time (min)',
            data: data.dwell,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            yAxisID: 'y', // Primary Y-axis
          },
          {
            label: 'Violations',
            data: data.violations,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            yAxisID: 'y1', // Secondary Y-axis
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: 'Zone Activity Chart (Y-axis based on Dwell Time)',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            position: 'left',
            title: {
              display: true,
              text: 'Dwell Time (min)',
            },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false }, // keep grid lines clean
            title: {
              display: true,
              text: 'Violations (count)',
            },
          },
        },
      },
    });
  }
}
