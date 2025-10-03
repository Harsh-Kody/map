import { Component } from '@angular/core';
import { MapStorageService } from './services/map-storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(private mapStorage: MapStorageService, private router: Router) {}

  async ngOnInit() {
    // const map = await this.mapStorage.getMap('mainMap');
    // if (map) {
    //   this.router.navigate(['/localmap']);
    // } else {
    //   this.router.navigate(['/upload-map']);
    // }
  }
}
