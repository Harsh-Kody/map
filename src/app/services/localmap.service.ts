import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { RobotLocation } from '../model/RobotLocation';
import { Shape } from '../model/shape';

@Injectable({
  providedIn: 'root',
})
export class LocalmapService {
  private socket: WebSocket;
  private locationSubject = new Subject<RobotLocation>();
  private metaDataSubject = new Subject<any>();
  private localisationSubject = new Subject<string>();
  private PedestrianSubject = new Subject<any>();
  private markerSubject = new Subject<any[]>();
  constructor() {
    this.socket = new WebSocket(
      'ws://192.168.0.102/v0/slam/ws/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc1ODA5MzQ3OCwiaWF0IjoxNzU3NDg4Njc4fQ.vz9gAAb2NgNLK6vtqE6KQfziYQYv0x-00ZybojV4tTE'
    );

    this.socket.onopen = () => {
      console.log('✅ Connected to backend');
      this.socket.send(
        JSON.stringify({
          start: [
            'FullPose',
            'MetaData',
            'SLAMStatus',
            'ObjectDetections',
            'MarkerDetections',
            'GlobalTrackedMarkers',
            'SLAMStatus',
          ],
        })
      );
    };
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // console.log('marker detection', data);
        if (data.full_pose?.localisation_status?.status) {
          const status = data.full_pose.localisation_status.localised;
          if (status) {
            this.localisationSubject.next('Localized');
          } else {
            this.localisationSubject.next('Relocalising');
          }
        }
        if (data.full_pose?.pose) {
          const pose = data.full_pose.pose;
          const drivingFlag = data.full_pose.driving;
          const robot: RobotLocation = {
            id: 1,
            // name: 'Robot1',
            x: pose.x,
            y: pose.y,
            z: pose.z,
            qx: pose.qx,
            qy: pose.qy,
            qz: pose.qz,
            qw: pose.qw,
            timestamp: pose.timestamp,
          };

          this.locationSubject.next(robot);
        }
        if (data.meta_data?.DistanceTravelled !== undefined) {
          this.metaDataSubject.next(data.meta_data);
        }
        if (data.object_detections?.objects) {
          // console.log('pedddd', data.object_detections.objects);
          const pedestrians = data.object_detections.objects
            .filter((obj: any) => obj.label === 'Person')
            .map((p: any, idx: number) => ({
              id: idx,
              world_location: p.world_location, // keep relative to robot
            }));

          this.PedestrianSubject.next(pedestrians);
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
          // console.log('markers', markers);
        }
      } catch (err) {
        console.error('Invalid WS message:', event.data, err);
      }
    };

    this.socket.onclose = () => {
      console.log('❌ Disconnected from backend');
    };

    this.socket.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error);
    };
  }
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
    return this.PedestrianSubject.asObservable();
  }
  getMarkers(): Observable<any[]> {
    return this.markerSubject.asObservable();
  }
}
