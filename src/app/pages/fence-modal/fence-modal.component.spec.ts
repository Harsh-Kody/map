import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FenceModalComponent } from './fence-modal.component';

describe('FenceModalComponent', () => {
  let component: FenceModalComponent;
  let fixture: ComponentFixture<FenceModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FenceModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FenceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
