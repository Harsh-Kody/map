import { Component } from '@angular/core';
// import { MapStorageService } from './services/map-storage.service';
import { Router } from '@angular/router';
import { MapStorageService } from './_services/map-storage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private mapStorage: MapStorageService, private router: Router) {}

  async ngOnInit() {
    // const map = await this.mapStorage.getMap('mainMap');
    // console.log('MAp');
    // if (map) {
    //   this.router.navigate(['/localmap']);
    // } else {
    //   this.router.navigate(['/upload-map']);
    // }
  }
}
