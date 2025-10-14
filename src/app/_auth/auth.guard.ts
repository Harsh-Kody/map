import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    ``;
    console.log('executed');
    if (localStorage.getItem('userToken') !== null) {
      return true;
    } else {
      console.log('no token');
      this.router.navigate(['/account/login']);
      return false;
    }
  }
}
