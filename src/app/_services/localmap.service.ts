import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { RobotLocation } from '../model/RobotLocation';

@Injectable({
  providedIn: 'root',
})
export class LocalmapService {
  private socket!: WebSocket;
  private connected = false;

  private locationSubject = new Subject<RobotLocation>();
  private metaDataSubject = new Subject<any>();
  private localisationSubject = new Subject<string>();
  private pedestrianSubject = new Subject<any[]>();
  private markerSubject = new Subject<any[]>();

  private activeFilters: string[] = [];
  private pendingStartFilters: string[] = [];

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('⚠️ Socket already open, skipping reconnect');
      return;
    }

    const ip = localStorage.getItem('_I');
    console.log('IP', ip);
    if (!ip) return;

    const decodedIP = atob(ip);
    this.socket = new WebSocket(
      `ws://${decodedIP}/v0/slam/ws/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc1ODA5MzQ3OCwiaWF0IjoxNzU3NDg4Njc4fQ.vz9gAAb2NgNLK6vtqE6KQfziYQYv0x-00ZybojV4tTE`
    );

    this.socket.onopen = () => {
      console.log('✅ Socket connected from LocalmapService');
      this.connected = true;

      // Send pending filters if any
      if (this.pendingStartFilters.length > 0) {
        this.startFilters(this.pendingStartFilters);
        this.pendingStartFilters = [];
      }
    };

    this.socket.onmessage = (event) => this.handleMessage(event);
    this.socket.onclose = () => {
      console.log('❌ Socket disconnected');
      this.connected = false;
      this.activeFilters = [];
    };
    this.socket.onerror = (error) =>
      console.error('⚠️ WebSocket error:', error);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.full_pose?.localisation_status?.status) {
        this.localisationSubject.next(
          data.full_pose.localisation_status.localised
            ? 'Localized'
            : 'Relocalising'
        );
      }
      if (data.full_pose?.pose) {
        const pose = data.full_pose.pose;
        this.locationSubject.next({
          id: 1,
          x: pose.x,
          y: pose.y,
          z: pose.z,
          qx: pose.qx,
          qy: pose.qy,
          qz: pose.qz,
          qw: pose.qw,
          timestamp: pose.timestamp,
        });
      }
      if (data.meta_data?.DistanceTravelled !== undefined) {
        this.metaDataSubject.next(data.meta_data);
      }
      if (data.object_detections?.objects) {
        const pedestrians = data.object_detections.objects
          .filter((obj: any) => obj.label === 'Person')
          .map((p: any, idx: number) => ({
            id: idx,
            world_location: p.world_location,
          }));
        this.pedestrianSubject.next(pedestrians);
      }
      if (data.tracked_markers) {
        const markers = data.tracked_markers.map((m: any) => ({
          id: m.id,
          x: m.estimated_pose.x,
          y: m.estimated_pose.y,
          qx: m.estimated_pose.qx,
          qy: m.estimated_pose.qy,
          qz: m.estimated_pose.qz,
          qw: m.estimated_pose.qw,
        }));
        this.markerSubject.next(markers);
      }
    } catch (err) {
      console.error('Invalid WS message:', event.data, err);
    }
  }

  /** Start listening for specific filters */
  public startFilters(filters: string[]) {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) {
      // Merge into pending (avoid duplicates)
      this.pendingStartFilters = Array.from(
        new Set([...this.pendingStartFilters, ...filters])
      );
      return;
    }

    // Filter out already active ones
    const newFilters = filters.filter((f) => !this.activeFilters.includes(f));

    if (newFilters.length > 0) {
      this.socket.send(JSON.stringify({ start: newFilters }));
      this.activeFilters.push(...newFilters);
    }
  }

  /** Stop listening for specific filters */
  public stopFilters(filters: string[]) {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return;

    const toStop = filters.filter((f) => this.activeFilters.includes(f));
    if (toStop.length > 0) {
      this.socket.send(JSON.stringify({ stop: toStop }));
      this.activeFilters = this.activeFilters.filter(
        (f) => !toStop.includes(f)
      );
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      console.log('🔌 Socket manually disconnected');
    }
  }

  // Observables
  getLocalisationStatus(): Observable<string> {
    return this.localisationSubject.asObservable();
  }
  getRobotLocation(): Observable<RobotLocation> {
    return this.locationSubject.asObservable();
  }
  getMetaData(): Observable<any> {
    return this.metaDataSubject.asObservable();
  }
  getPedestrians(): Observable<any[]> {
    return this.pedestrianSubject.asObservable();
  }
  getMarkers(): Observable<any[]> {
    return this.markerSubject.asObservable();
  }
}
