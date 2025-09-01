import { TestBed } from '@angular/core/testing';

import { MapStorageService } from './services/map-storage.service';

describe('MapStorageService', () => {
  let service: MapStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
