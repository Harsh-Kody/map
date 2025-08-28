import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LocalmapComponent } from './localmap/localmap.component';
import { FormsModule } from '@angular/forms';
import { UploadMapComponent } from './upload-map/upload-map.component';

@NgModule({
  declarations: [
    AppComponent,
    LocalmapComponent,
    UploadMapComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
