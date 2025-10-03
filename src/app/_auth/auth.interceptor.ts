import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
// import { PermissionsService } from '../_services/permissions.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  public onlineOffline: boolean = navigator.onLine;

  // tslint:disable-next-line: max-line-length
  constructor(private router: Router) {
    if (!this.onlineOffline) {
      alert('Please check you Internet connection!');
    }
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    req = req.clone({
      // headers: req.headers.set(
      //   'Accept-Language',
      //   // this.dataService.getLang().value.lang
      // ),
    });
    if (req.headers.get('No-Auth') === 'True') {
      const clonedreq = req.clone({
        headers: req.headers.delete('No-Auth', 'True'),
      });
      return next.handle(clonedreq.clone());
    }

    const token = localStorage.getItem('userToken');
    if (token !== null) {
      const clonedreq = req.clone({
        headers: req.headers.set('Authorization', 'Bearer ' + token),
      });
      // const clonedreq = req.clone({
      //   headers: req.headers.set('X-Auth-Token', token),
      // });
      return next.handle(clonedreq).pipe(
        tap({
          next: (succ) => {},
          error: (err) => {
            // this.errorHandler.handleError(err);
          },
        })
      );
    } else {
      if (req.url.includes('/hrms')) {
        localStorage.clear();
        // this.modalService.dismissAll();
        this.router.navigateByUrl('/');
      }
      return next.handle(req);
    }
  }
}
