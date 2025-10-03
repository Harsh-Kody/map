import { Component } from '@angular/core';
import { LoginService } from '../services/login.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

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
  constructor(
    private loginService: LoginService,
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      username: [null, [Validators.required]],
      password: [null, [Validators.required]],
    });
    this.token = localStorage.getItem('userToken');
  }

  ngOnInit(): void {}

  hasError(controlName: any, errorName: any) {
    return (
      this.isSubmited && this.loginForm.get(controlName)?.hasError(errorName)
    );
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
          this.router.navigateByUrl('/home');
        },
        error: (err) => {
          console.log(err);
        },
      });
    }
  }
}
