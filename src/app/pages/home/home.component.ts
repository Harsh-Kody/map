import { Component } from '@angular/core';
import { ApiKeyService } from '../../_services/api-key.service';
import { LoginService } from '../../_services/login.service';
import { Router } from '@angular/router';
import { MessageSlamSystemInfoService } from '../../_services/message-slam-system-info.service';
import { WsTokenService } from '../../_services/ws-token.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  key: any;
  keyList: any;
  asyncapi: any;
  slam: any;
  message_log: any;
  systemInfo: any;
  wsToken: any;
  apiKey: any;

  constructor(
    private api_key: ApiKeyService,
    private loginService: LoginService,
    private router: Router,
    private message_slam_systemservice: MessageSlamSystemInfoService,
    private ws_tokenservice: WsTokenService
  ) {}

  async ngOnInit() {
    console.log('Home Component');

    this.getApiKey();
    this.getMessage_log();
    this.getAsyncapi();
    this.getSlam();
    this.getSystem_Info();
    this.getWs_Token();
  }
  getApiKey() {
    this.api_key.getApiKey().subscribe({
      next: (res) => {
        console.log(res);
        this.keyList = res;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Api_Key List Fetched');
      },
    });
  }

  addApiKey() {
    this.api_key.addApiKey(this.key).subscribe({
      next: (res) => {
        console.log(res);
        this.getApiKey();
        this.key = null;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Api_Key Added');
      },
    });
  }

  logOut() {
    this.loginService.logout().subscribe({
      next: (res) => {
        console.log(res);
        localStorage.clear();
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('LogOut');
      },
    });
  }

  deleteKey(key: any) {
    this.api_key.deleteApiKey(key.last_3_chars).subscribe({
      next: (res) => {
        console.log(res);
        this.getApiKey();
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Api_Key Deleted');
      },
    });
  }

  getAsyncapi() {
    this.loginService.getAsyncapi().subscribe({
      next: (res) => {
        console.log(res);
        this.asyncapi = res;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Asyncapi.json fetched');
      },
    });
  }

  getSlam() {
    this.message_slam_systemservice.getSlam().subscribe({
      next: (res) => {
        console.log(res);
        this.slam = res;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Slam Fetched');
      },
    });
  }

  getMessage_log() {
    this.message_slam_systemservice.getMessage_log(10).subscribe({
      next: (res) => {
        console.log(res);
        this.message_log = res;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Message_Log Fetched');
      },
    });
  }

  getSystem_Info() {
    this.message_slam_systemservice.getSystem_Info().subscribe({
      next: (res) => {
        console.log(res);
        this.systemInfo = res;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('System_Info Fetched');
      },
    });
  }

  getWs_Token() {
    this.ws_tokenservice.getws_token().subscribe({
      next: (res) => {
        console.log(res);
        this.wsToken = res;
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('Ws_Token Fetched');
      },
    });
  }

  submitWithApikey() {
    let formdata = new FormData();
    formdata.append('api_key', this.apiKey);
    this.loginService.loginWithApi_key(formdata).subscribe({
      next: (res) => {
        console.log(res);
      },
      error: (err) => {
        console.log(err);
      },
      complete: () => {
        console.log('ApiKey');
      },
    });
  }
}
