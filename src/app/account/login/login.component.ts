import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginService } from '../../_services/login.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  key: any;
  KeyList: any;
  username: any;
  password: any;
  isLogin: boolean = false;
  token: any;
  loginForm!: FormGroup;
  isSubmited: boolean = false;
  IPForm!: FormGroup;
  IPSubmit = false;
  @ViewChild('AddIPModal') AddUrlModal!: TemplateRef<any>;
  constructor(
    private loginService: LoginService,
    private formBuilder: FormBuilder,
    private router: Router,
    private modalService: NgbModal
  ) {
    this.loginForm = this.formBuilder.group({
      username: [null, [Validators.required]],
      password: [null, [Validators.required]],
    });
    this.token = localStorage.getItem('userToken');

    this.IPForm = this.formBuilder.group({
      ip: [null, [Validators.required, Validators.maxLength(100)]],
    });
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (environment.useLocalStorageIP) {
      const useLocalStorageIP = environment.useLocalStorageIP;
      if (useLocalStorageIP) {
        if (!localStorage.getItem('_I')) {
          this.showModal();
        }
      }
    }
  }

  showModal() {
    const modalRef = this.modalService.open(this.AddUrlModal, {
      centered: true,
      windowClass: 'modal-holder',
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.result.then(
      (result) => {
        // Handle modal close event if needed
      },
      (reason) => {
        // Handle modal dismiss event if needed
      }
    );
  }

  hasError(controlName: any, errorName: any) {
    return (
      this.isSubmited && this.loginForm.get(controlName)?.hasError(errorName)
    );
  }

  hasErrorInIP(controlName: string, errorName: string) {
    return this.IPSubmit && this.IPForm.get(controlName)?.hasError(errorName);
  }

  login() {
    this.isSubmited = true;
    let formdata = new FormData();
    console.log(this.username);
    let data = this.loginForm.value;
    formdata.append('username', data.username);
    formdata.append('password', data.password);
    console.log(formdata);
    if (this.loginForm.valid) {
      this.loginService.loginUser(formdata).subscribe({
        next: (res: any) => {
          console.log(res);
          localStorage.setItem('userToken', res.access_token);
          this.isLogin = true;
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          console.log(err);
        },
      });
    }
  }

  IPFormSubmit() {
    this.IPSubmit = true;
    if (this.IPForm.valid) {
      const ip = this.IPForm.value.ip;
      this.loginService.verifyDeviceIP(ip).subscribe({
        next: (res) => {
          const encodedIP = btoa(ip);
          localStorage.setItem('_I', encodedIP);
          this.resetIPForm();
        },
        error: (err) => {
          console.error('❌ Invalid or unreachable IP:', err);
          alert(
            'Unable to connect to the device. Please check the IP and try again.'
          );
        },
      });
    }
  }

  onCancel() {
    this.modalService.dismissAll();
    const ip = this.extractIP(environment.webServiceEndPointURL);
    localStorage.setItem('_I', btoa(ip));
  }

  resetIPForm() {
    this.IPSubmit = false;
    this.modalService.dismissAll();
    this.IPForm.reset();
    this.IPForm.markAsPristine();
    this.IPForm.markAsUntouched();
  }

  extractIP(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname;
    } catch (e) {
      console.error('Invalid URL:', url);
      return '192.168.0.102';
    }
  }
}
