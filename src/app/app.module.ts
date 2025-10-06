import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LocalmapComponent } from './localmap/localmap.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UploadMapComponent } from './upload-map/upload-map.component';
import { ImageCropperModule } from 'ngx-image-cropper';
import { FenceModalComponent } from './fence-modal/fence-modal.component';
import { NgChartsModule } from 'ng2-charts';
import { RobotVibrationComponent } from './robot-vibration/robot-vibration.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AuthInterceptor } from './_auth/auth.interceptor';
import { IPComponent } from './ip/ip.component';
@NgModule({
  declarations: [
    AppComponent,
    LocalmapComponent,
    UploadMapComponent,
    FenceModalComponent,
    RobotVibrationComponent,
    LoginComponent,
    HomeComponent,
    IPComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ImageCropperModule,
    NgChartsModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
