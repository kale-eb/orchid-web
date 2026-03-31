// Shared types for the Orchid web canvas app

export interface StickerCatalogItem {
  id: string;
  filename: string;
  name: string;
  categories: string[];
  tags: string[];
  premium: boolean;
}

export interface CanvasSticker {
  id: string; // unique instance id
  catalogId: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface DrawLine {
  id: string;
  points: number[];
  color: string;
  strokeWidth: number;
}

export type Tool = "select" | "draw";

// Action for undo history
export type CanvasAction =
  | { type: "add-sticker"; sticker: CanvasSticker }
  | { type: "remove-sticker"; stickerId: string }
  | { type: "add-line"; line: DrawLine }
  | { type: "set-background-color"; prevColor: string; newColor: string }
  | { type: "set-background-image"; prevImage: string | null; newImage: string | null };
