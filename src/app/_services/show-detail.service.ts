import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ShowDetailService {
  private socket: WebSocket | null = null;
  private dataSubject = new Subject<any>();
  private connected = false;

  private pendingStartFilters: string[] = [];
  private lastSentFilters: string[] = [];

  constructor() {
    this.initSocket();
  }

  private initSocket(): void {
    const ip = localStorage.getItem('_I');
    if (ip) {
      const decodedIP = atob(ip);
      this.socket = new WebSocket(
        `ws://${decodedIP}/v0/slam/ws/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc1ODA5MzQ3OCwiaWF0IjoxNzU3NDg4Njc4fQ.vz9gAAb2NgNLK6vtqE6KQfziYQYv0x-00ZybojV4tTE`
      );

      this.socket.onopen = () => {
        console.log('✅ Socket connected to backend from show-detail');
        this.connected = true;

        // Send pending filters if any
        if (this.pendingStartFilters.length > 0) {
          this.sendStartFilters(this.pendingStartFilters);
          this.pendingStartFilters = [];
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const topKeys = Object.keys(data);

          if (
            topKeys.length === 1 &&
            (topKeys[0] === 'device_status' || topKeys[0] === 'notifications')
          ) {
            // Ignoring this message
            return;
          }
          this.dataSubject.next(data);
        } catch (err) {
          console.error('Invalid WS message:', event.data, err);
        }
      };

      this.socket.onclose = () => {
        console.log('❌socket Disconnected from show-detail');
        this.connected = false;
      };

      this.socket.onerror = (error) => {
        console.error('⚠️ WebSocket error:', error);
      };
    }
  }

  /**
   * Sends new filters to start and stops previous ones
   */
  public sendStartFilters(newFilters: string[]): void {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) {
      this.pendingStartFilters = newFilters;
      return;
    }

    const filtersToStop = this.lastSentFilters.filter(
      (f) => !newFilters.includes(f)
    );
    const filtersToStart = newFilters.filter(
      (f) => !this.lastSentFilters.includes(f)
    );

    // Stop removed filters
    if (filtersToStop.length > 0) {
      const stopMessage = {
        stop: filtersToStop,
      };
      this.socket.send(JSON.stringify(stopMessage));
    }

    // Start new filters
    if (filtersToStart.length > 0) {
      const startMessage = {
        start: filtersToStart,
      };
      this.socket.send(JSON.stringify(startMessage));
    }

    // Update tracking
    this.lastSentFilters = [...newFilters];
  }

  public getDataStream(): Observable<any> {
    return this.dataSubject.asObservable();
  }

  public sendStopFilters(filters: string[]): void {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;

    const stopMessage = {
      stop: filters,
    };
    this.socket.send(JSON.stringify(stopMessage));

    // Clear last sent filters only if they're the ones being stopped
    if (
      this.lastSentFilters.length === filters.length &&
      this.lastSentFilters.every((f) => filters.includes(f))
    ) {
      this.lastSentFilters = [];
    }
  }
}
