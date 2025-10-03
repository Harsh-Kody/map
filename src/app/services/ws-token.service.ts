import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WS_TOKEN } from '../shared/serviceUrl';

@Injectable({
  providedIn: 'root',
})
export class WsTokenService {
  constructor(private http: HttpClient) {}

  getws_token() {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(WS_TOKEN, { headers });
  }
}
