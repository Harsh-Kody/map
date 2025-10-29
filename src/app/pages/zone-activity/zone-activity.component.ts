import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-zone-activity',
  templateUrl: './zone-activity.component.html',
  styleUrls: ['./zone-activity.component.scss'],
})
export class ZoneActivityComponent implements OnInit {
  chartPie: any;
  chartBar: any;
  filterForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.filterForm = this.fb.group({
      date: ['', Validators.required],
    });
  }

  hasError(controlName: string, errorName: string) {
    return this.filterForm.get(controlName)?.hasError(errorName);
  }

  applyFilter() {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { date } = this.filterForm.value;
    const data = this.getFilteredData(date);

    this.loadPieChart(data);
    this.loadBarChart(data);
  }

  private getFilteredData(selectedDate: string) {
    const raw = localStorage.getItem('robotFenceData');
    if (!raw) return { labels: [], dwell: [], violations: [] };

    const parsed = JSON.parse(raw);
    const labels: string[] = [];
    const dwell: number[] = [];
    const violations: number[] = [];

    const start = new Date(selectedDate + 'T00:00:00');
    const end = new Date(selectedDate + 'T23:59:59');

    for (const [robotId, zoneData] of Object.entries<any>(parsed)) {
      for (const [fenceName, fenceData] of Object.entries<any>(zoneData)) {
        if (!fenceData) continue;

        let totalMinutes = 0;
        let violationCount = 0;

        // ✅ Dwell Time Calculation
        if (Array.isArray(fenceData.sessions)) {
          fenceData.sessions.forEach((s: any) => {
            const entry = s.entryTime ? new Date(s.entryTime) : null;
            const exit = s.exitTime ? new Date(s.exitTime) : null;

            if (
              (entry && entry <= end && (!exit || exit >= start)) ||
              (exit && exit >= start && exit <= end)
            ) {
              totalMinutes += s.durationMinutes || 0;
            }
          });
        }

        // ✅ Violations Calculation
        if (Array.isArray(fenceData.violations)) {
          fenceData.violations.forEach((v: any) => {
            const vt = v.time ? new Date(v.time) : null;
            if (vt && vt >= start && vt <= end) violationCount++;
          });
        }

        if (totalMinutes > 0 || violationCount > 0) {
          labels.push(fenceName);
          dwell.push(Number(totalMinutes.toFixed(2)));
          violations.push(violationCount);
        }
      }
    }

    return { labels, dwell, violations };
  }

  private loadPieChart(data: { labels: string[]; dwell: number[] }) {
    if (this.chartPie) this.chartPie.destroy();

    const ctx = document.getElementById('fencePieChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chartPie = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Dwell Time (min)',
            data: data.dwell,
            backgroundColor: [
              '#36A2EB',
              '#FF6384',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' },
          title: { display: true, text: 'Time Spent by Location (Pie Chart)' },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce(
                  (acc: number, val: number) => acc + val,
                  0
                );
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${value} min (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  private loadBarChart(data: {
    labels: string[];
    dwell: number[];
    violations: number[];
  }) {
    if (this.chartBar) this.chartBar.destroy();

    const ctx = document.getElementById('fenceBarChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Dwell Time (min)',
            data: data.dwell,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            yAxisID: 'y',
          },
          {
            label: 'Violations',
            data: data.violations,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: 'Zone Activity (Dwell Time & Violations)',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            position: 'left',
            title: { display: true, text: 'Dwell Time (min)' },
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Violations (count)' },
          },
        },
      },
    });
  }
}
