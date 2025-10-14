import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ASYNCAPI, LOGIN, LOGIN_API_KEY, LOGOUT } from '../shared/serviceUrl';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  constructor(private http: HttpClient) {}

  loginUser(data: any) {
    const headers = new HttpHeaders().set('enctype', 'multipart/form-data');
    return this.http.post(LOGIN, data, { headers });
  }

  loginWithApi_key(data: any) {
    const headers = new HttpHeaders().set('enctype', 'multipart/form-data');
    return this.http.post(LOGIN_API_KEY, data, { headers });
  }

  logout() {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(LOGOUT, {}, { headers });
  }

  getAsyncapi() {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(ASYNCAPI, { headers });
  }

  verifyDeviceIP(ip: string) {
    const testUrl = `http://${ip}/v0/asyncapi.json`;
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(testUrl, { headers });
  }
}
