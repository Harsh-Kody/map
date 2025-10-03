import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LocalmapComponent } from './localmap/localmap.component';
import { UploadMapComponent } from './upload-map/upload-map.component';
import { RobotVibrationComponent } from './robot-vibration/robot-vibration.component';

const routes: Routes = [
  { path: 'upload-map', component: UploadMapComponent },
  { path: 'localmap', component: LocalmapComponent },
  { path: 'robot-vibration', component: RobotVibrationComponent },
  { path: '**', redirectTo: 'upload-map', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
