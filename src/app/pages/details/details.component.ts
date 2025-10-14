import { ChangeDetectorRef, Component } from '@angular/core';
import { LocalmapService } from '../../_services/localmap.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ShowDetailService } from '../../_services/show-detail.service';
// import { ShowDetailService } from '../services/show-details.service';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent {
  filterOptions = [
    { label: 'Pose', value: 'Pose' },
    { label: 'MetaData', value: 'MetaData' },
    { label: 'DiagnosticMessages', value: 'DiagnosticMessages' },
    { label: 'SLAMStatus', value: 'SLAMStatus' },
    { label: 'MarkerDetections', value: 'MarkerDetections' },
    { label: 'MarkerWorldPose', value: 'MarkerWorldPose' },
    { label: 'GlobalTrackedMarkers', value: 'GlobalTrackedMarkers' },
    { label: 'GlobalPointCloud', value: 'GlobalPointCloud' },
    { label: 'PanopticBoundingBox3D', value: 'PanopticBoundingBox3D' },
    { label: 'PositioningStatus', value: 'PositioningStatus' },
    { label: 'FullPose', value: 'FullPose' },
    { label: 'ObjectDetections', value: 'ObjectDetections' },
  ];

  selectedFilters: string[] = [];
  socketData: any[] = [];
  filteredData: any[] = [];
  latestData: { [key: string]: any } = {};
  copyButtonText: string = 'Copy';
  copiedMessageId!: string | null;
  isStreamStarted = false;

  filterKeyMap: { [backendKey: string]: string } = {
    pose: 'Pose',
    meta_data: 'MetaData',
    diagnostic_messages: 'DiagnosticMessages',
    slam_status: 'SLAMStatus',
    marker_detections: 'MarkerDetections',
    marker_world_pose: 'MarkerWorldPose',
    global_tracked_markers: 'GlobalTrackedMarkers',
    global_point_cloud: 'GlobalPointCloud',
    panoptic_bounding_box3d: 'PanopticBoundingBox3D',
    positioning_status: 'PositioningStatus',
    full_pose: 'FullPose',
    object_detections: 'ObjectDetections',
  };
  private socketSub?: Subscription;

  constructor(
    private socketService: ShowDetailService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load filters from queryParams if available
    this.route.queryParams.subscribe((params) => {
      if (params['filters']) {
        const filtersParam = params['filters'];
        this.selectedFilters = Array.isArray(filtersParam)
          ? filtersParam
          : [filtersParam];
        // if (this.selectedFilters && this.selectedFilters.length > 0) {
        // } else {
        //   this.socketData = [];
        // }
      }
    });

    this.socketSub = this.socketService
      .getDataStream()
      .subscribe((data: any) => {
        const backendKey = Object.keys(data)[0];
        const value = data[backendKey];

        const frontendKey = this.filterKeyMap[backendKey] || backendKey;

        this.latestData[frontendKey] = value;
      });
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
    this.socketService.sendStopFilters(this.selectedFilters);
  }

  onFilterChange() {
    this.route.queryParams.subscribe((queryParams) => {
      const filtersParam = queryParams['filters'];

      const array = Array.isArray(filtersParam) ? filtersParam : [filtersParam];
      this.socketService.sendStopFilters(array);
      this.isStreamStarted = false;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { filters: this.selectedFilters },
        queryParamsHandling: 'merge',
      });
    });
  }

  startStream() {
    this.latestData = {}; // Clear previous data
    this.isStreamStarted = true;
    this.socketService.sendStartFilters(this.selectedFilters);
  }

  endStream() {
    this.latestData = {};
    this.isStreamStarted = false;
    this.socketService.sendStopFilters(this.selectedFilters);
  }

  copyToClipBoard(event: MouseEvent, filterKey: string) {
    event.preventDefault();
    event.stopPropagation();
    const json = JSON.stringify(this.latestData[filterKey], null, 2);

    navigator.clipboard
      .writeText(json)
      .then(() => {
        this.copyButtonText = 'Copied!!';
        this.copiedMessageId = filterKey;

        setTimeout(() => {
          this.copyButtonText = 'Copy';
          this.copiedMessageId = null;
        }, 3000);
      })
      .catch((err) => {
        console.error('Error', err);
      });
  }
}
