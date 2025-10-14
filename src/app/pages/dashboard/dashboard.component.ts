import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { MapStorageService } from '../../_services/map-storage.service';
import { LocalmapService } from '../../_services/localmap.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  // Map state
  selectedImage: string | null = null; // preview or stored map
  modalMode: 'add' | 'edit' | 'view' = 'add';

  // Upload & cropper state
  imageChangedEvent: any = '';
  croppedImage: string | null = null;
  selectedFileName: string = '';
  errorMessage = '';

  // UI helpers
  isProcessing = false;

  @ViewChild('imageModal') imageModal!: TemplateRef<any>;
  private modalRef!: NgbModalRef;

  constructor(
    private modalService: NgbModal,
    private router: Router,
    private mapStorage: MapStorageService,
    private localmapService: LocalmapService
  ) {}

  async ngOnInit() {
    const blob = await this.mapStorage.getMap('mainMap');
    if (blob) {
      this.selectedImage = URL.createObjectURL(blob);
    }
    this.localmapService.connect();
  }

  /** Open modal for add/edit/view */
  openModal(mode: 'add' | 'edit' | 'view') {
    this.modalMode = mode;
    this.errorMessage = '';
    this.croppedImage = null;
    this.imageChangedEvent = '';
    this.selectedFileName = '';
    this.modalRef = this.modalService.open(this.imageModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  /** Handle file selection */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image.';
      return;
    }

    this.imageChangedEvent = event;
    this.selectedFileName = file.name;
    this.errorMessage = '';
  }

  /** Cropper callback */
  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64 || null;
  }

  /** Save cropped image to local storage */
  async onUpload(modal: any) {
    if (!this.croppedImage) {
      this.errorMessage = 'Please crop the image first.';
      return;
    }

    this.isProcessing = true;

    try {
      const response = await fetch(this.croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'mainMap.png', { type: blob.type });

      await this.mapStorage.saveMap('mainMap', file);
      this.selectedImage = URL.createObjectURL(blob);

      this.clearSelection();
      modal.close();
    } catch (err) {
      this.errorMessage = 'Failed to save map. Try again.';
    } finally {
      this.isProcessing = false;
    }
  }

  /** Delete stored map */
  async deleteImage() {
    if (confirm('Are you sure you want to delete the image?')) {
      await this.mapStorage.deleteMap('mainMap');
      this.selectedImage = null;
      this.clearSelection();
    }
  }

  /** Reset state */
  clearSelection() {
    this.selectedFileName = '';
    this.croppedImage = null;
    this.imageChangedEvent = '';
    this.errorMessage = '';
  }

  /** Navigation */
  navigateLocalMap() {
    this.router.navigate(['/localmap']);
  }
}
