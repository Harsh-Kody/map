import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RobotVibrationComponent } from './robot-vibration.component';

describe('RobotVibrationComponent', () => {
  let component: RobotVibrationComponent;
  let fixture: ComponentFixture<RobotVibrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RobotVibrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RobotVibrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
