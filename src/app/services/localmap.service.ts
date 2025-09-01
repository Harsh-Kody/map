import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { RobotLocation } from '../model/RobotLocation';
import { Shape } from '../model/shape';

@Injectable({
  providedIn: 'root',
})
export class LocalmapService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000');
  }

  getCarLocation(): Observable<RobotLocation[]> {
    return new Observable((observer) => {
      this.socket.on('robot_update', (data: RobotLocation[]) => {
        observer.next(data);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from robot server');
      });
    });
  }
  updateFences(fences: Shape[]) {
    this.socket.emit('update_fences', fences);
  }
}
