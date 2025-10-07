import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MapStorageService } from '../services/map-storage.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-upload-map',
  templateUrl: './upload-map.component.html',
  styleUrls: ['./upload-map.component.scss'],
})
export class UploadMapComponent implements OnInit {
  mapChoice: 'yes' | 'no' | null = 'yes';
  robotMapSrc: string = 'assets/FINAL-1-1.png'; // static map for "Yes"
  croppedImage: string | null = null;
  showCropper = false;
  imageChangedEvent: any = '';
  errorMessage = '';

  constructor(
    private mapStorage: MapStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    // For "No", map will be uploaded by user. No need to load anything for "Yes" since it's static
  }

  openCropperForUpload() {
    this.showCropper = false;
    document.getElementById('fileInput')?.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.imageChangedEvent = event;
    this.showCropper = true;
    this.errorMessage = '';
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
    const blob = await response.blob();

    const newHash = await this.hashBlob(blob);
    const storedHash = localStorage.getItem('mapHash');

    if (storedHash && storedHash === newHash) {
      this.errorMessage = 'This map is already saved.';
    }

    const file = new File([blob], 'mainMap.png', {
      type: blob.type,
      lastModified: Date.now(),
    });
    await this.mapStorage.saveMap('mainMap', file);
    localStorage.setItem('mapHash', newHash);

    // Update preview
    this.robotMapSrc = URL.createObjectURL(blob);
    this.showCropper = false;
    this.croppedImage = null;

    // Navigate to localmap route
    this.router.navigate(['/localmap']);
  }
}
