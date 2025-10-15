import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RobotComponent } from './robot/robot.component';
import { DetailsComponent } from './details/details.component';
import { HomeComponent } from './home/home.component';
import { LocalmapComponent } from './localmap/localmap.component';
import { UploadMapComponent } from './upload-map/upload-map.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from '../account/login/login.component';
import { RobotSpeedComponent } from './robot-speed/robot-speed.component';
import { RobotVibrationComponent } from './robot-vibration/robot-vibration.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'details', component: DetailsComponent },
  { path: 'upload-map', component: UploadMapComponent },
  { path: 'localmap', component: LocalmapComponent },
  { path: 'graphs', component: RobotComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'robot-speed', component: RobotSpeedComponent },
  { path: 'robot-intensity', component: RobotVibrationComponent },
  // { path: '**', redirectTo: 'upload-map', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
