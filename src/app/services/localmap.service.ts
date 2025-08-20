import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class LocalmapService {
  // private socket: Socket;

  // constructor() {
  //   this.socket = io('http://localhost:3000');
  // }

  // Listen for car location
  // getCarLocation(): Observable<{ lat: number; lng: number }> {
  //   return new Observable((observer) => {
  //     this.socket.on('carLocation', (coords) => {
  //       observer.next(coords);
  //     });
  //   });
  // }
}
