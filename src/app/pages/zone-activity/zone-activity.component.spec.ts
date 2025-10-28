import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneActivityComponent } from './zone-activity.component';

describe('ZoneActivityComponent', () => {
  let component: ZoneActivityComponent;
  let fixture: ComponentFixture<ZoneActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ZoneActivityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoneActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
