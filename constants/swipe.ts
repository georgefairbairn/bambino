import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Gesture thresholds
export const SWIPE_THRESHOLD = 120; // px to trigger action
export const SWIPE_VELOCITY = 800; // velocity threshold for quick swipes

// Layout heights (approximate safe area + header + tab bar + buttons)
export const HEADER_HEIGHT = 64; // Compact header row
export const BUTTON_AREA_HEIGHT = 80; // Action buttons
export const TAB_BAR_HEIGHT = 80; // Bottom tab bar
export const SAFE_AREA_TOP = 50; // Approximate safe area (status bar)

// Card dimensions
export const CARD_WIDTH = SCREEN_WIDTH - 32; // Almost full width with 16px margins
export const CARD_HEIGHT = 420;
export const CARD_HEIGHT_FULL =
  SCREEN_HEIGHT - SAFE_AREA_TOP - HEADER_HEIGHT - BUTTON_AREA_HEIGHT - TAB_BAR_HEIGHT - 16;

// Animation constants
export const ROTATION_FACTOR = 0.08; // rotation per px of horizontal movement
export const MAX_ROTATION = 12; // max degrees rotation

// Screen boundaries for exit animations
export const EXIT_X = SCREEN_WIDTH + 100;

// Swipe action colors (softer, more pleasant tones)
export const SWIPE_COLORS = {
  like: '#34d399', // emerald-400 - softer green
  nope: '#fb7185', // rose-400 - softer coral/pink
  skip: '#6b7280', // gray-500
};

// Card styling
export const CARD_STYLES = {
  borderRadius: 24,
  backgroundColor: '#FFFBF5', // warm cream/off-white
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};

// Peek card (behind active card) styling
export const PEEK_CARD = {
  scale: 0.95,
  translateY: 8,
};

// Spring animation config
export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

// Timing animation config
export const TIMING_CONFIG = {
  duration: 300,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
