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
@NgModule({
  declarations: [
    AppComponent,
    LocalmapComponent,
    UploadMapComponent,
    FenceModalComponent,
    RobotVibrationComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    ImageCropperModule,
    NgChartsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
