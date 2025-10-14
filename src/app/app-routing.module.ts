import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './_auth/auth.guard';
import { LayoutsComponent } from './layouts/layouts.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

const routes: Routes = [
  // { path: '', component: LoginComponent },
  // // { path: 'robot', component: RobotComponent },
  // // { path: 'detail', component: s },
  // { path: 'details', component: DetailsComponent },
  // { path: 'ip', component: IPComponent },
  // { path: 'home', component: HomeComponent },
  // { path: 'upload-map', component: UploadMapComponent },
  // { path: 'localmap', component: LocalmapComponent },
  // { path: 'graphs', component: RobotComponent },
  // { path: '**', redirectTo: 'upload-map', pathMatch: 'full' },
  {
    path: '',
    component: LayoutsComponent,
    loadChildren: () =>
      import('./pages/pages.module').then((m) => m.PagesModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'account',
    loadChildren: () =>
      import('./account/account.module').then((m) => m.AccountModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
