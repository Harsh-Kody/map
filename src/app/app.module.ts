import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LocalmapComponent } from './localmap/localmap.component';
import { FormsModule } from '@angular/forms';
import { UploadMapComponent } from './upload-map/upload-map.component';
import { ImageCropperModule } from 'ngx-image-cropper';
import { FenceModalComponent } from './fence-modal/fence-modal.component';
@NgModule({
  declarations: [
    AppComponent,
    LocalmapComponent,
    UploadMapComponent,
    FenceModalComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ImageCropperModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
