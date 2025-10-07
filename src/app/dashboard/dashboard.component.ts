import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { MapStorageService } from '../services/map-storage.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  robotMapSrc: string | null = null;
  croppedImage: string | null = null;
  imageChangedEvent: any = '';
  showCropper = false;
  errorMessage = '';
  modalMode: 'add' | 'edit' | 'view' = 'view';

  @ViewChild('mapModal') mapModal!: TemplateRef<any>;

  constructor(
    private mapStorage: MapStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private modalService: NgbModal
  ) {}

  async ngOnInit() {
    const blob = await this.mapStorage.getMap('mainMap');
    if (blob) this.robotMapSrc = URL.createObjectURL(blob);
  }

  openMapModal(mode: 'add' | 'edit' | 'view') {
    this.modalMode = mode;
    this.errorMessage = '';
    this.showCropper = false;
    this.croppedImage = null;
    this.imageChangedEvent = '';
    this.modalService.open(this.mapModal, { size: 'lg' });
  }

  async deleteMap() {
    if (confirm('Are you sure you want to delete the current map?')) {
      await this.mapStorage.deleteMap('mainMap');
      this.robotMapSrc = null;
      localStorage.removeItem('mapHash');
      this.cdr.detectChanges();
    }
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

  async onUpload(modal: any) {
    if (!this.croppedImage) {
      this.errorMessage = 'Please crop the image first.';
      return;
    }

    const response = await fetch(this.croppedImage);
    const blob = await response.blob();
    const file = new File([blob], 'mainMap.png', { type: blob.type });

    await this.mapStorage.saveMap('mainMap', file);
    this.robotMapSrc = URL.createObjectURL(blob);
    this.showCropper = false;
    this.croppedImage = null;

    modal.close();
  }

  navigateLocalMap() {
    this.router.navigate(['/localmap']);
  }
}
