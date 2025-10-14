import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ImageCropperModule } from 'ngx-image-cropper';
import { NgChartsModule } from 'ng2-charts';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './_auth/auth.interceptor';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthGuard } from './_auth/auth.guard';
import { RouterModule } from '@angular/router';
import { LayoutsModule } from './layouts/layouts.module';
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule,
    LayoutsModule,
    FormsModule,
    ReactiveFormsModule,
    ImageCropperModule,
    NgChartsModule,
    NgSelectModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
