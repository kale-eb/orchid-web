// Canvas dimensions (iPhone 15 Pro logical resolution)
export const CANVAS_WIDTH = 393;
export const CANVAS_HEIGHT = 852;

// Sticker default size when placed
export const DEFAULT_STICKER_SIZE = 72;

// Drawing defaults
export const DEFAULT_DRAW_COLOR = "#2D2D3A";
export const DEFAULT_DRAW_WIDTH = 4;

// Color presets for the color picker
export const COLOR_PRESETS = [
  "#FFE8F0",
  "#E0D4FF",
  "#D4F0E0",
  "#FFF3D4",
  "#D4E8FF",
  "#FFD4D4",
  "#F0E0FF",
  "#FFFFFF",
  "#2D2D3A",
  "#C77DBA",
  "#FF6B8A",
  "#4ECDC4",
];

// Background color presets (same as color picker, good defaults)
export const BG_COLOR_PRESETS = COLOR_PRESETS;

// Sticker category tabs
export const STICKER_CATEGORIES = [
  "All",
  "Love",
  "Food",
  "Animals",
  "Nature",
  "Things",
];

// Sticker URL via our proxy API (Firebase Storage requires auth)
export function getStickerUrl(category: string, filename: string): string {
  return `/api/sticker?category=${encodeURIComponent(category.toLowerCase())}&filename=${encodeURIComponent(filename)}`;
}
