import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages-routing.module';
import { DetailsComponent } from './details/details.component';
import { FenceModalComponent } from './fence-modal/fence-modal.component';
import { HomeComponent } from './home/home.component';
import { RobotVibrationComponent } from './robot-vibration/robot-vibration.component';
import { UploadMapComponent } from './upload-map/upload-map.component';
import { RobotComponent } from './robot/robot.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgChartsModule } from 'ng2-charts';
import { ImageCropperModule } from 'ngx-image-cropper';
import { LocalmapComponent } from './localmap/localmap.component';
import { RouterModule } from '@angular/router';
import { LayoutsModule } from '../layouts/layouts.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RobotSpeedComponent } from './robot-speed/robot-speed.component';
import { SharedModule } from '../shared/shared.module';
import { ToastNotificationComponent } from '../shared/toast-notification/toast-notification.component';

@NgModule({
  declarations: [
    LocalmapComponent,
    UploadMapComponent,
    FenceModalComponent,
    RobotVibrationComponent,
    RobotComponent,
    HomeComponent,
    DetailsComponent,
    DashboardComponent,
    RobotSpeedComponent,
    ToastNotificationComponent,
  ],
  imports: [
    CommonModule,
    PagesRoutingModule,
    LayoutsModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ImageCropperModule,
    NgChartsModule,
    NgSelectModule,
  ],
})
export class PagesModule {}
