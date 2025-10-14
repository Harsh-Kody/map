import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalmapComponent } from './localmap.component';

describe('LocalmapComponent', () => {
  let component: LocalmapComponent;
  let fixture: ComponentFixture<LocalmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LocalmapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocalmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
