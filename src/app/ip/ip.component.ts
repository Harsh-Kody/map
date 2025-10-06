import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ip',
  templateUrl: './ip.component.html',
  styleUrl: './ip.component.scss',
})
export class IPComponent {
  IPForm!: FormGroup;
  isSubmit = false;
  constructor(private formBuilder: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.IPForm = this.formBuilder.group({
      ip: [null, [Validators.required, Validators.maxLength(100)]],
    });
  }

  submitHandler() {
    this.isSubmit = true;
    if (this.IPForm.valid) {
      const ip = this.IPForm.value.ip;
      console.log('IP', ip);

      const encodedIP = btoa(ip);
      localStorage.setItem('_I', encodedIP);
      this.router.navigate(['login']);
      this.IPForm.reset();
    }
  }

  hasError(controlName: string, errorName: string) {
    return this.isSubmit && this.IPForm.get(controlName)?.hasError(errorName);
  }
}
