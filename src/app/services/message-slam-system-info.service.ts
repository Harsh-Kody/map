import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MESSAGE_LOG, SLAM, SYSTEM_INFO } from '../shared/serviceUrl';

@Injectable({
  providedIn: 'root',
})
export class MessageSlamSystemInfoService {
  constructor(private http: HttpClient) {}

  getMessage_log(startTime: any) {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    let params = new HttpParams().set('since_timestamp', startTime);
    return this.http.get(MESSAGE_LOG, { headers, params });
  }

  getSlam() {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(SLAM, { headers });
  }

  getSystem_Info() {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(SYSTEM_INFO, { headers });
  }
}
