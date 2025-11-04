import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart } from 'chart.js';
import { LoginComponent } from '../../account/login/login.component';
import { IndexedDBService } from '../../_services/indexeddb.service';

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
  constructor(private fb: FormBuilder, private idb: IndexedDBService) {}

  async ngOnInit() {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    this.filterForm = this.fb.group({
      date: [formattedToday, Validators.required],
    });
    this.generateDummyAisleVisitData();
    // this.generateDummyCabinData();
    // await this.addDummyRobotStatsData();
    // await this.addStaticDrivingData();
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
  async addStaticDrivingData() {
    const dummyData = {
      robotId: '1',
      hours: {
        '2025-11-01T09': 60.0,
        '2025-11-01T10': 59.0,
        '2025-11-01T11': 38.9,
        '2025-11-01T12': 50.2,
        '2025-11-01T13': 35.4,
        '2025-11-01T14': 27.8,
        '2025-11-01T15': 46.1,
        '2025-11-01T16': 54.2,
        '2025-11-01T17': 39.6,
        '2025-11-01T18': 32.7,
        '2025-11-01T19': 21.3,
        '2025-11-03T10': 55.2,
        '2025-11-03T11': 46.8,
        '2025-11-03T12': 33.1,
        '2025-11-03T13': 28.9,
        '2025-11-03T14': 24.0,
        '2025-11-03T15': 41.2,
        '2025-11-03T16': 52.9,
        '2025-11-03T17': 50.3,
        '2025-11-03T18': 39.8,
        '2025-11-04T13': 0.05,
        '2025-11-04T14': 0.07,
      },
    };

    await this.idb.set('drivingData', dummyData);
  }
  async addDummyRobotStatsData() {
    const robotId = '1';
    const now = new Date();
    const stats: any[] = [];

    // Generate for the last 4 days
    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() - dayOffset);

      for (let hour = 10; hour <= 19; hour++) {
        // 10 AM to 7 PM
        const entry = new Date(date);
        entry.setHours(
          hour,
          Math.floor(Math.random() * 60),
          Math.floor(Math.random() * 60)
        );

        const timestamp = entry.getTime();
        const distance = Number((Math.random() * 500 + 50).toFixed(2)); // 50–550 meters
        const stops = Math.floor(Math.random() * 10); // 0–9 stops
        const hourStr = entry.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        stats.push({ timestamp, distance, stops, hour: hourStr });
      }
    }

    const record = { robotId, stats };
    await this.idb.set('robotStats', record);
    console.log('✅ Dummy robotStats data added:', record);
  }
  generateDummyCabinData() {
    const cabins = [
      'Cabin 1',
      'Cabin 2',
      'Cabin 3',
      'Java',
      'Python',
      'Angular',
      'Mobile',
    ]; // you can add more if needed
    const now = new Date();
    const data: any = {};

    for (const cabin of cabins) {
      const sessions: any[] = [];

      // Generate data for the last 4 days (10 AM to 7 PM)
      for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
        const date = new Date(now);
        date.setDate(now.getDate() - dayOffset);

        const sessionCount = Math.floor(Math.random() * 4) + 2; // 2–5 sessions per day

        for (let i = 0; i < sessionCount; i++) {
          // Random entry time between 10 AM – 6 PM
          const entry = new Date(date);
          entry.setHours(
            10 + Math.floor(Math.random() * 9),
            Math.floor(Math.random() * 60),
            Math.floor(Math.random() * 60)
          );

          const durationMinutes = Number((Math.random() * 30 + 1).toFixed(2)); // 1–30 min
          const exit = new Date(entry.getTime() + durationMinutes * 60 * 1000);

          const hasTimeViolation = durationMinutes > 15 && Math.random() > 0.3; // ~70% chance of violation if >15min

          sessions.push({
            entryTime: entry.toISOString(),
            exitTime: exit.toISOString(),
            durationMinutes,
            hasTimeViolation,
          });
        }
      }

      const totalDwellMinutes = Number(
        sessions.reduce((sum, s) => sum + s.durationMinutes, 0).toFixed(2)
      );
      const totalViolationsCount = sessions.filter(
        (s) => s.hasTimeViolation
      ).length;

      data[cabin] = {
        currentlyInside: false,
        sessions,
        totalDwellMinutes,
        totalViolationsCount,
      };
    }

    const record = { id: 'combined', data };
    console.log('✅ Dummy cabin data:', record);
    this.idb.set('robotFenceData', {
      id: 'combined',
      data: record,
    });
    return record;
  }
  async generateDummyAisleVisitData() {
    const aisleNames = ['Java', 'Python', 'C++', 'Go', 'NodeJS'];
    const now = new Date();

    for (const name of aisleNames) {
      const timestamps: string[] = [];

      // Generate 5–12 visits randomly across 4 days
      const totalVisits = Math.floor(Math.random() * 8) + 5;

      for (let i = 0; i < totalVisits; i++) {
        const date = new Date(now);
        const dayOffset = Math.floor(Math.random() * 4);
        date.setDate(now.getDate() - dayOffset);

        // Random time between 10 AM – 7 PM
        date.setHours(10 + Math.floor(Math.random() * 9)); // 10–18
        date.setMinutes(Math.floor(Math.random() * 60));
        date.setSeconds(Math.floor(Math.random() * 60));

        timestamps.push(date.toISOString());
      }

      // Sort timestamps chronologically
      timestamps.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Create the record in the same structure that handleAisleVisit() expects
      const record = {
        name,
        count: timestamps.length,
        timestamps,
      };

      // ✅ Save each aisle record into IndexedDB
      await this.idb.set('aisleVisits', record);

      console.log(`✅ Stored dummy aisle: ${name}`, record);
    }

    console.log('✅ All dummy aisle visit data stored successfully!');
  }

  async applyFilter() {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    const { date } = this.filterForm.value;
    const data = await this.getFilteredData(date);
    const hourlyData = await this.getHourlyData(date);
    const hourlyActivity = await this.getHourlyActivityData(date);
    this.loadPieChart(data);
    this.loadBarChart(data);
    this.loadLineChart(hourlyData);
    this.loadAisleVisitChart(date);
    this.loadHourlyActivityChart(hourlyActivity);
  }

  private async getFilteredData(selectedDate: string) {
    const raw = await this.idb.get('robotFenceData', 'combined');
    if (!raw) return { labels: [], dwell: [], violations: [] };

    const parsed = raw.data || raw; // ✅ FIXED — use object directly
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

  private async getHourlyData(selectedDate: string) {
    const record = await this.idb.get('robotStats', '1'); // matches save format
    if (!record || !record.stats)
      return { labels: [], distance: [], stops: [] };

    const parsed = record.stats;
    const start = new Date(selectedDate + 'T00:00:00').getTime();
    const end = new Date(selectedDate + 'T23:59:59').getTime();

    const filtered = parsed.filter(
      (d: any) => d.timestamp >= start && d.timestamp <= end
    );

    // Group by hour
    const hourly: Record<
      number,
      { ts: number; distance: number; stops: number }
    > = {};

    for (const d of filtered) {
      const hour = new Date(d.timestamp).getHours();
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
    const distance = sortedHours.map((h) => hourly[h].distance);
    const stops = sortedHours.map((h) => hourly[h].stops);

    return { labels, distance, stops };
  }

  private async getHourlyActivityData(selectedDate: string) {
    const allDrivingData = await this.idb.getAll('drivingData');
    if (!allDrivingData || allDrivingData.length === 0)
      return { labels: [], utilization: [], activeVehicles: [] };

    const hourlyTotals: Record<string, number[]> = {};

    for (const robot of allDrivingData) {
      const hours = robot.hours || {};
      for (const [hourKey, minutes] of Object.entries<number>(hours)) {
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
      const activeCount = minutesArray.filter((m) => m > 0).length;
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

  private async loadAisleVisitChart(selectedDate?: string) {
    const allAisles = await this.idb.getAll('aisleVisits');
    if (!allAisles || allAisles.length === 0) return;

    const start = selectedDate
      ? new Date(selectedDate + 'T00:00:00').getTime()
      : 0;
    const end = selectedDate
      ? new Date(selectedDate + 'T23:59:59').getTime()
      : Infinity;

    const labels: string[] = [];
    const counts: number[] = [];

    for (const aisle of allAisles) {
      const countForDate = aisle.timestamps?.filter((t: number) => {
        const ts = new Date(t).getTime();
        return ts >= start && ts <= end;
      }).length;

      if (countForDate && countForDate > 0) {
        labels.push(aisle.name);
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
