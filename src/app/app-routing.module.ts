import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LocalmapComponent } from './localmap/localmap.component';
import { UploadMapComponent } from './upload-map/upload-map.component';
import { RobotVibrationComponent } from './robot-vibration/robot-vibration.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { RobotComponent } from './robot/robot.component';
import { IPComponent } from './ip/ip.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'robot', component: RobotComponent },
  // { path: 'detail', component: s },
  { path: 'ip', component: IPComponent },
  { path: 'home', component: HomeComponent },
  { path: 'upload-map', component: UploadMapComponent },
  { path: 'localmap', component: LocalmapComponent },
  { path: 'graphs', component: RobotVibrationComponent },
  { path: '**', redirectTo: 'upload-map', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
