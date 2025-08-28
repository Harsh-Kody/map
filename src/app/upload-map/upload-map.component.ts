import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MapStorageService } from '../services/map-storage.service';

@Component({
  selector: 'app-upload-map',
  templateUrl: './upload-map.component.html',
  styleUrls: ['./upload-map.component.scss'],
})
export class UploadMapComponent {
  selectedFile: File | null = null;
  errorMessage = '';

  constructor(private router: Router, private mapStorage: MapStorageService) {}

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] || null;
    this.errorMessage = '';
  }

  async onUpload() {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file.';
      return;
    }

    const img = new Image();
    const objectURL = URL.createObjectURL(this.selectedFile);

    img.onload = async () => {
      if (img.width < 2500 || img.height < 2500) {
        this.errorMessage = 'Image must be 2000 x 2000 pixels!';
        return;
      }

      // 🔹 Load the current stored image (if any)
      const existing = await this.mapStorage.getMap('mainMap');

      if (existing) {
        const newBuffer = await this.selectedFile!.arrayBuffer();
        const existingBuffer = await existing.arrayBuffer();

        const isSame =
          newBuffer.byteLength === existingBuffer.byteLength &&
          new Uint8Array(newBuffer).every(
            (b, i) => b === new Uint8Array(existingBuffer)[i]
          );

        if (!isSame) {
          localStorage.removeItem('geoFences');
        }
      } else {
        localStorage.removeItem('geoFences');
      }

      await this.mapStorage.saveMap('mainMap', this.selectedFile!);

      this.router.navigate(['/localmap']);
    };

    img.src = objectURL;
  }
}
