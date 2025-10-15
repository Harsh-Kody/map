import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RobotSpeedComponent } from './robot-speed.component';

describe('RobotSpeedComponent', () => {
  let component: RobotSpeedComponent;
  let fixture: ComponentFixture<RobotSpeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RobotSpeedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RobotSpeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
