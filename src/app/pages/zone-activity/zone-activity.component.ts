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
  chartLine: any;
  chartAisle: any;
  chartHourlyActivity: any;
  filterForm!: FormGroup;
  storeArray: any;
  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    this.filterForm = this.fb.group({
      date: [formattedToday, Validators.required],
    });
    // const backupString = JSON.stringify(localStorage);
    // this.storeArray = backupString;
    // const data = JSON.parse(backupString);
    // for (const key in data) {
    //   localStorage.setItem(key, data[key]);
    // }
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
    const hourlyData = this.getHourlyData(date);
    const hourlyActivity = this.getHourlyActivityData(date);
    this.loadPieChart(data);
    this.loadBarChart(data);
    this.loadLineChart(hourlyData);
    this.loadAisleVisitChart(date);
    this.loadHourlyActivityChart(hourlyActivity);
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

  private getHourlyData(selectedDate: string) {
    const raw = localStorage.getItem('robot_1_stats');
    if (!raw) return { labels: [], distance: [], stops: [] };

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('⚠️ Failed to parse robot_1_stats');
      return { labels: [], distance: [], stops: [] };
    }

    // Ensure proper numeric types
    parsed = parsed.map((d) => ({
      timestamp:
        typeof d.timestamp === 'number' ? d.timestamp : Number(d.timestamp),
      distance: Number(d.distance) || 0,
      stops: Number(d.stops) || 0,
      hour: d.hour || new Date(Number(d.timestamp)).toLocaleTimeString(),
    }));

    // Filter by selected date
    const start = new Date(selectedDate + 'T00:00:00').getTime();
    const end = new Date(selectedDate + 'T23:59:59').getTime();

    const filtered = parsed.filter(
      (d) => d.timestamp >= start && d.timestamp <= end
    );

    // Group by hour (take last data point of each hour)
    const hourly: Record<
      number,
      { ts: number; distance: number; stops: number }
    > = {};

    for (const d of filtered) {
      const date = new Date(d.timestamp);
      const hour = date.getHours(); // 0..23
      if (!hourly[hour] || d.timestamp > hourly[hour].ts) {
        hourly[hour] = {
          ts: d.timestamp,
          distance: d.distance,
          stops: d.stops,
        };
      }
    }

    const sortedHours = Object.keys(hourly)
      .map((h) => Number(h))
      .sort((a, b) => a - b);

    const labels = sortedHours.map((h) => `${h}:00`);
    const distance = sortedHours.map((h) => Number(hourly[h].distance) || 0);
    const stops = sortedHours.map((h) => Number(hourly[h].stops) || 0);

    return { labels, distance, stops };
  }

  private getHourlyActivityData(selectedDate: string) {
    const raw = localStorage.getItem('drivingData');
    if (!raw) return { labels: [], utilization: [], activeVehicles: [] };

    const parsed = JSON.parse(raw);
    const hourlyTotals: Record<string, number[]> = {};

    for (const [robotId, robotData] of Object.entries<any>(parsed)) {
      if (!robotData?.hours) continue;

      for (const [hourKey, minutes] of Object.entries<number>(
        robotData.hours
      )) {
        // ✅ Only count data for the selected date
        if (hourKey.startsWith(selectedDate)) {
          if (!hourlyTotals[hourKey]) hourlyTotals[hourKey] = [];
          hourlyTotals[hourKey].push(minutes);
        }
      }
    }

    const sortedHours = Object.keys(hourlyTotals).sort();
    const labels: string[] = [];
    const utilization: number[] = [];
    const activeVehicles: number[] = [];

    for (const hourKey of sortedHours) {
      const minutesArray = hourlyTotals[hourKey];
      const activeCount = minutesArray.filter((m) => m > 0).length; // ✅ active robots this hour
      const avgMinutes =
        minutesArray.reduce((a, b) => a + b, 0) / minutesArray.length;
      const percentage = Math.min((avgMinutes / 60) * 100, 100);

      labels.push(hourKey.slice(11, 13) + ':00');
      utilization.push(Number(percentage.toFixed(2)));
      activeVehicles.push(activeCount);
    }

    return { labels, utilization, activeVehicles };
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
        },
      },
    });
  }
  private loadHourlyActivityChart(data: {
    labels: string[];
    utilization: number[];
    activeVehicles: number[];
  }) {
    if (this.chartHourlyActivity) this.chartHourlyActivity.destroy();
    const ctx = document.getElementById(
      'hourlyActivityChart'
    ) as HTMLCanvasElement;
    if (!ctx) return;
    console.log('data', data);
    this.chartHourlyActivity = new Chart(ctx, {
      type: 'line', // 🔹 switched to line chart
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Active Vehicles',
            data: data.activeVehicles,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            yAxisID: 'y',
            tension: 0.4, // 🔹 smooth curve
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
          },
          {
            label: 'Utilization (%)',
            data: data.utilization,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: 'Hourly Activity (Active Vehicles & Utilization)',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.dataset.label === 'Utilization (%)')
                  return `Utilization: ${context.formattedValue}%`;
                return `Active Vehicles: ${context.formattedValue}`;
              },
            },
          },
        },
        scales: {
          y1: {
            beginAtZero: true,
            max: 100,
            position: 'right',
            title: { display: true, text: 'Utilization (%)' },
          },
          y: {
            beginAtZero: true,
            position: 'left',
            title: { display: true, text: 'Active Vehicles (count)' },
            grid: { drawOnChartArea: false },
          },
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
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Stops',
            data: data.stops,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            yAxisID: 'y1',
            tension: 0.4,
            fill: false,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
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

  private loadAisleVisitChart(selectedDate?: string) {
    const raw = localStorage.getItem('aisleVisits');
    if (!raw) return;

    const aisleVisits = JSON.parse(raw);
    const start = selectedDate
      ? new Date(selectedDate + 'T00:00:00').getTime()
      : 0;
    const end = selectedDate
      ? new Date(selectedDate + 'T23:59:59').getTime()
      : Infinity;
    const labels: string[] = [];
    const counts: number[] = [];

    for (const [aisle, data] of Object.entries<any>(aisleVisits)) {
      if (!data.timestamps) continue;
      const countForDate = data.timestamps.filter((t: string) => {
        const ts = new Date(t).getTime();
        return ts >= start && ts <= end;
      }).length;

      if (countForDate > 0) {
        labels.push(aisle);
        counts.push(countForDate);
      }
    }

    if (this.chartAisle) this.chartAisle.destroy();

    const ctx = document.getElementById('aisleVisitChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.chartAisle = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Visit Count',
            data: counts,
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Aisle Visit Frequency' },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Visits' },
          },
        },
      },
    });
  }
}
