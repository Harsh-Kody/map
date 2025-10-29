import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart } from 'chart.js';
import { LoginComponent } from '../../account/login/login.component';

@Component({
  selector: 'app-zone-activity',
  templateUrl: './zone-activity.component.html',
  styleUrls: ['./zone-activity.component.scss'],
})
export class ZoneActivityComponent implements OnInit {
  chartPie: any;
  chartBar: any;
  chartLine: any; // ✅ new
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
    const hourlyData = this.getHourlyData(date); // ✅ new

    this.loadPieChart(data);
    this.loadBarChart(data);
    this.loadLineChart(hourlyData); // ✅ new
  }

  // ✅ Dwell + Violation Data (already present)
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

  // ✅ NEW: Hourly Data (Distance + Stops)
  private getHourlyData(selectedDate: string) {
    // Adjust key to whatever you store hourly records under
    const raw = localStorage.getItem('robot_1_stats');
    if (!raw) return { labels: [], distance: [], stops: [] };

    const parsed = JSON.parse(raw); // array of { distance, stops, timestamp, hour? ... }
    const start = new Date(selectedDate + 'T00:00:00').getTime();
    const end = new Date(selectedDate + 'T23:59:59').getTime();

    // Map hour -> best (latest) record for that hour
    const latestPerHour: {
      [hour: number]: { distance: number; stops: number; ts: number };
    } = {};

    parsed.forEach((d: any) => {
      // tolerant parse: accept number or numeric string
      const tsNum =
        typeof d.timestamp === 'number' ? d.timestamp : Number(d.timestamp);
      if (isNaN(tsNum)) return;

      // ensure milliseconds timestamp; if your timestamps are seconds multiply by 1000
      const ts = tsNum;
      if (ts < start || ts > end) return;

      const date = new Date(ts);
      const hour = date.getHours(); // 0..23

      // keep the record with the largest timestamp for this hour
      const existing = latestPerHour[hour];
      if (!existing || ts > existing.ts) {
        latestPerHour[hour] = {
          distance: d.distance ?? 0,
          stops: d.stops ?? 0,
          ts,
        };
      }
    });

    // Sort hours ascending and build arrays
    const hours = Object.keys(latestPerHour)
      .map((h) => Number(h))
      .sort((a, b) => a - b);

    const labels = hours.map((h) => {
      // format like "3 PM" or "15:00" — here as "3:00" (24-hour). Change if you want AM/PM.
      return `${h}:00`;
    });

    const distance = hours.map((h) => latestPerHour[h].distance);
    const stops = hours.map((h) => latestPerHour[h].stops);

    return { labels, distance, stops };
  }

  // ✅ PIE CHART
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
        },
      },
    });
  }

  // ✅ BAR CHART
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
          title: { display: true, text: 'Zone Activity (Bar Chart)' },
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

  // ✅ NEW: LINE CHART (Distance + Stops per hour)
  private loadLineChart(data: {
    labels: string[];
    distance: number[];
    stops: number[];
  }) {
    if (this.chartLine) this.chartLine.destroy();
    const ctx = document.getElementById('hourlyLineChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chartLine = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Distance (m)',
            data: data.distance,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y',
            tension: 0.4,
            fill: false,
          },
          {
            label: 'Stops',
            data: data.stops,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Hourly Robot Activity (Line Chart)' },
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Distance (m)' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Stops (count)' },
          },
        },
      },
    });
  }
}
