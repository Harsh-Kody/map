export const MAP_CONFIG = {
  /** Map width in meters */
  WIDTH: 31.9,

  /** Map height in meters */
  HEIGHT: 33.2,

  /** World coordinate scale factor */
  WORLD_SCALE: 30.929,

  /** Slamcore backend map to current map scale */
  SLAMCORE_SCALE: 114.461,

  /** Maximum zoom scale allowed */
  MAX_SCALE: 2,

  /** Minimum square geofence size in pixels */
  MIN_SQUARE_SIZE: 30,
} as const;

// ========== ROBOT DETECTION & TRACKING ==========
export const ROBOT_CONFIG = {
  /** Robot marker radius in pixels */
  RADIUS: 6,

  /** Camera field of view in degrees */
  FOV_DEGREES: 120,

  /** Camera visible range in meters */
  CAMERA_RANGE_METERS: 3,

  /** Arrow length multiplier for direction indicator */
  ARROW_LENGTH: 20,

  /** Arrowhead size multiplier */
  ARROW_HEAD_LENGTH: 6,

  /** Minimum movement threshold to count as motion (meters) */
  MIN_MOVEMENT_THRESHOLD: 0.01,

  /** Stop detection threshold (milliseconds) */
  STOP_THRESHOLD_MS: 3000,

  /** Hourly stats reset interval (milliseconds) */
  HOURLY_RESET_MS: 3600000,

  /** Maximum position history to keep */
  MAX_POSITION_HISTORY: 50,

  /** Minimum positions needed for stop detection */
  MIN_POSITIONS_FOR_STOP: 5,

  /** Minimum coordinate change to detect movement */
  MIN_COORDINATE_CHANGE: 0.05,
} as const;

// ========== GEOFENCING ==========
export const GEOFENCE_CONFIG = {
  /** Handle size for resizing shapes (pixels) */
  HANDLE_SIZE: 5,

  /** Click tolerance for handle detection (pixels) */
  HANDLE_TOLERANCE: 10,

  /** Default square geofence size */
  DEFAULT_SQUARE_SIZE: 200,

  /** Minimum square size */
  MIN_SQUARE_SIZE: 100,

  /** Default circle radius */
  DEFAULT_CIRCLE_RADIUS: 100,

  /** Default colors for geofences */
  DEFAULT_COLORS: [
    '#ff006aff',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#000000',
    '#008080',
    '#f37034',
    '#b8312f',
    '#ffb7ce',
    '#dfc5fe',
    '#8b48d2',
    '#257623ff',
  ],

  /** Default geofence color */
  DEFAULT_COLOR: '#ff0000',

  /** Grid size for snapping (pixels) */
  GRID_SIZE: 5,

  /** Click drag threshold (pixels) */
  CLICK_DRAG_THRESHOLD: 5,
} as const;

// ========== VIOLATION TRACKING ==========
export const VIOLATION_CONFIG = {
  /** Speed violation notification throttle (milliseconds) */
  SPEED_VIOLATION_THROTTLE_MS: 15000,

  /** Default time limit in minutes */
  DEFAULT_TIME_LIMIT_MINUTES: 2,

  /** Default max speed limit */
  DEFAULT_MAX_SPEED: 10,

  /** Default min speed limit */
  DEFAULT_MIN_SPEED: 0,

  /** Default speed limit */
  DEFAULT_SPEED_LIMIT: 0,

  /** Restricted zone reminder interval (milliseconds) */
  RESTRICTED_REMINDER_MS: 30000,
} as const;

// ========== PEDESTRIAN DETECTION ==========
export const PEDESTRIAN_CONFIG = {
  /** Pedestrian marker size (pixels) */
  SIZE: 10,

  /** Pedestrian head radius divisor */
  HEAD_RADIUS_DIVISOR: 2.5,

  /** Pedestrian body proportion */
  BODY_HEIGHT_DIVISOR: 4,

  /** Pedestrian leg spread divisor */
  LEG_SPREAD_DIVISOR: 3,
} as const;

// ========== CANVAS RENDERING ==========
export const CANVAS_CONFIG = {
  /** Maximum canvas width as viewport percentage */
  MAX_WIDTH_PERCENT: 0.9,

  /** Maximum canvas height as viewport percentage */
  MAX_HEIGHT_PERCENT: 0.9,

  /** Grid line color */
  GRID_COLOR: '#ccc',

  /** Grid line width */
  GRID_LINE_WIDTH: 1,

  /** Default line width for shapes */
  SHAPE_LINE_WIDTH: 1,

  /** Handle stroke color */
  HANDLE_STROKE_COLOR: 'black',

  /** Handle fill color */
  HANDLE_FILL_COLOR: 'red',

  /** Robot path color */
  PATH_COLOR: '#ff8c1a',

  /** Robot path line width */
  PATH_LINE_WIDTH: 1.5,

  /** Robot path opacity */
  PATH_OPACITY: 0.9,

  /** Robot path max points */
  PATH_MAX_POINTS: 200,
} as const;

// ========== CHART CONFIGURATION ==========
export const CHART_CONFIG = {
  /** Maximum vibration data points */
  MAX_VIBRATION_DATA_POINTS: 200,

  /** Chart update animation duration */
  ANIMATION_DURATION: 0,

  /** Vibration chart color */
  VIBRATION_COLOR: 'rgba(0, 200, 0, 0.8)',

  /** Vibration chart background */
  VIBRATION_BG_COLOR: 'rgba(0, 200, 0, 0.2)',
} as const;

// ========== AURA/FOV RENDERING ==========
export const AURA_CONFIG = {
  /** Aura gradient start color */
  GRADIENT_START: 'rgba(0, 128, 255, 0.25)',

  /** Aura gradient end color */
  GRADIENT_END: 'rgba(0, 128, 255, 0)',

  /** Direction arrow color */
  ARROW_COLOR: 'black',

  /** Direction arrow line width */
  ARROW_LINE_WIDTH: 2,
} as const;

// ========== MARKER CONFIGURATION ==========
export const MARKER_CONFIG = {
  /** Marker circle radius */
  RADIUS: 8,

  /** Marker outer circle radius */
  OUTER_RADIUS: 18,

  /** Marker color */
  COLOR: '#ff0000ff',

  /** Marker stroke color */
  STROKE_COLOR: 'white',

  /** Marker stroke width */
  STROKE_WIDTH: 2,

  /** Marker label font */
  LABEL_FONT: '12px Arial',

  /** Marker label offset */
  LABEL_OFFSET: 14,
} as const;

// ========== STORAGE KEYS ==========
export const STORAGE_KEYS = {
  GEOFENCES: 'geoFences',
  ROBOT_FENCE_DATA: 'robotFenceData',
  ROBOT_STATS: 'robotStats',
  AISLE_VISITS: 'aisleVisits',
  DRIVING_DATA: 'drivingData',
  MAIN_MAP: 'mainMap',
} as const;

// ========== WEBSOCKET FILTERS ==========
export const WEBSOCKET_FILTERS = [
  'FullPose',
  'MetaData',
  'ObjectDetections',
  'MarkerDetections',
  'GlobalTrackedMarkers',
  'SLAMStatus',
] as const;

// ========== FORM VALIDATION ==========
export const FORM_VALIDATION = {
  MAX_SPEED: 30,
  MIN_SPEED_LIMIT: 0,
  MAX_SPEED_LIMIT: 10,
  TIME_LIMIT_MAX: 7,
  REQUIRED_POLYGON_POINTS: 3,
} as const;

// ========== RESTRICTED ZONE ==========
export const RESTRICTED_CONFIG = {
  /** Restricted zone marker size */
  MARKER_SIZE: 20,

  /** Restricted zone circle color */
  CIRCLE_COLOR: 'rgba(255,0,0,0.3)',

  /** Restricted zone stroke width */
  STROKE_WIDTH: 3,

  /** Restricted zone cross divisor */
  CROSS_DIVISOR: 1.5,
} as const;

// ========== TYPE EXPORTS ==========
export type MapConfig = typeof MAP_CONFIG;
export type RobotConfig = typeof ROBOT_CONFIG;
export type GeofenceConfig = typeof GEOFENCE_CONFIG;
export type ViolationConfig = typeof VIOLATION_CONFIG;
