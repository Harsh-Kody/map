import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-fence-modal',
  templateUrl: './fence-modal.component.html',
  styleUrl: './fence-modal.component.scss',
})
export class FenceModalComponent {
  @Input() fenceData: any = { name: '', isDraggable: false, isResizable: false }; 

  constructor(public activeModal: NgbActiveModal) {}

  save() {
    if (!this.fenceData.name.trim()) {
      alert('Fence name is required!');
      return;
    }
    this.activeModal.close(this.fenceData);
  }

  cancel() {
    this.activeModal.dismiss();
  }
}
