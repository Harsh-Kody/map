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

  constructor() {
    this.socket = new WebSocket(
      'ws://192.168.0.102/v0/slam/ws/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc1ODA5MzQ3OCwiaWF0IjoxNzU3NDg4Njc4fQ.vz9gAAb2NgNLK6vtqE6KQfziYQYv0x-00ZybojV4tTE'
    );

    this.socket.onopen = () => {
      console.log('✅ Connected to backend');

      this.socket.send(
        JSON.stringify({
          start: ['FullPose'], 
        })
      );
    };
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.full_pose?.pose) {
          const pose = data.full_pose.pose;
          const drivingFlag = data.full_pose.driving
          const robot: RobotLocation = {
            id: 1,
            // name: 'Robot1',
            x: pose.x,
            y: pose.y,
            qx: pose.qx,
            qy: pose.qy,
            qz: pose.qz,
            qw: pose.qw,
            timestamp: pose.timestamp,
          };

          this.locationSubject.next(robot);
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

  getRobotLocation(): Observable<RobotLocation> {
    return this.locationSubject.asObservable();
  }

  // Send fences update to backend
  // updateFences(fences: Shape[]) {
  //   if (this.socket.readyState === WebSocket.OPEN) {
  //     this.socket.send(
  //       JSON.stringify({
  //         type: 'update_fences',
  //         fences,
  //       })
  //     );
  //   } else {
  //     console.warn('⚠️ Socket not open, cannot send fences');
  //   }
  // }
}
