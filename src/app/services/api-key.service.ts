import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_KEY } from '../shared/serviceUrl';

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  constructor(private http: HttpClient) {}

  getApiKey() {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.get(API_KEY, { headers });
  }

  addApiKey(key: any) {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(API_KEY, { key }, { headers });
  }

  deleteApiKey(key: any) {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    let params = new HttpParams().set('api_key_last_3_chars', key);
    return this.http.delete(API_KEY, { headers, params });
  }
}
