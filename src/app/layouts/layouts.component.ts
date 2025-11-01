import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../_services/login.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-layouts',
  templateUrl: './layouts.component.html',
  styleUrl: './layouts.component.scss',
})
export class LayoutsComponent {
  serverIp!: any;
  IPForm!: FormGroup;
  IPSubmit = false;
  constructor(
    private loginService: LoginService,
    private router: Router,
    private formBuilder: FormBuilder,
    private modalService: NgbModal
  ) {
    const ip = localStorage.getItem('_I');
    if (ip) {
      this.serverIp = atob(ip);
      this.IPForm = this.formBuilder.group({
        ip: [null, [Validators.required, Validators.maxLength(100)]],
      });
    }
  }

  hasErrorInIP(controlName: string, errorName: string) {
    return this.IPSubmit && this.IPForm.get(controlName)?.hasError(errorName);
  }

  openModal(modal: any) {
    this.IPForm.patchValue({ ip: this.serverIp });
    this.modalService.open(modal, {
      centered: true,
      windowClass: 'modal-holder',
      backdrop: 'static',
      keyboard: false,
    });
  }

  logOut() {
    this.loginService.logout().subscribe({
      next: (res) => {
        console.log(res);
        // localStorage.clear();
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
