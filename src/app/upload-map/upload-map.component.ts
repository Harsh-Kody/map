import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { MapStorageService } from '../services/map-storage.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-upload-map',
  templateUrl: './upload-map.component.html',
  styleUrls: ['./upload-map.component.scss'],
})
export class UploadMapComponent {
  croppedImage: string | null = null;
  errorMessage = '';
  showCropper = false;
  imageChangedEvent: any = '';

  constructor(
    private router: Router,
    private mapStorage: MapStorageService,
    private cdr: ChangeDetectorRef
  ) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    console.log("file",file);
    if (!file) return;
    // event.target.value = null;
    const img = new Image();
    console.log("img",img);
    const objectURL = URL.createObjectURL(file);
    console.log("obj",objectURL);
    img.onload = () => {
      // if (img.width < 2000 || img.height < 2000) {
      //   this.errorMessage = 'Image must be at least 2000 x 2000 pixels!';
      //   this.showCropper = false;
      //   URL.revokeObjectURL(objectURL);
      //   return;
      // }

      this.errorMessage = '';
      this.showCropper = true;
      this.imageChangedEvent = event;
      URL.revokeObjectURL(objectURL);
    };

    img.src = objectURL;
    // this.cdr.markForCheck();
  }

  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64 || null;
  }

  async hashBlob(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async onUpload() {
    if (!this.croppedImage) {
      this.errorMessage = 'Please crop the image first.';
      return;
    }

    const response = await fetch(this.croppedImage);
    console.log("base64" , this.croppedImage);
    console.log("res",response);
    const blob = await response.blob();
    const file = new File([blob], 'mapImage' + '.' + blob.type.split('/')[1], {
      type: blob.type,
      lastModified: Date.now(),
    });
    const img = new Image();
    const objectURL = URL.createObjectURL(file);

    img.onload = async () => {
      // if (img.width < 2000 || img.height < 2000) {
      //   this.errorMessage = 'Image must be at least 2000 x 2000 pixels!';
      //   this.croppedImage = null;
      //   return;
      // }

      const newHash = await this.hashBlob(blob);
      const storedHash = localStorage.getItem('mapHash');

      if (storedHash && storedHash === newHash) {
        this.router.navigate(['/localmap']);
        return;
      }
      
      localStorage.removeItem('geoFences');
      localStorage.setItem('mapHash', newHash);

      const file = new File([blob], 'mainMap.png', {
        type: blob.type,
        lastModified: Date.now(),
      });

      await this.mapStorage.saveMap('mainMap', file);
      this.router.navigate(['/localmap']);
    };

    img.src = objectURL;
    // this.cdr.markForCheck();
  }
}
