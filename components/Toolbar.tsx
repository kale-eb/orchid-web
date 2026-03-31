"use client";

import React, { useRef } from "react";
import type { Tool } from "@/lib/types";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUploadPhoto: (dataUrl: string) => void;
  onOpenStickers: () => void;
  onOpenColorPicker: () => void;
  onUndo: () => void;
  drawColor: string;
  drawWidth: number;
  onDrawWidthChange: (w: number) => void;
  canUndo: boolean;
}

// Simple SVG icon components
function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function StickerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function DrawIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function ColorIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill={color} stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

const buttonBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: "8px 10px",
  borderRadius: 12,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--text-secondary)",
  transition: "all 0.15s ease",
  WebkitTapHighlightColor: "transparent",
  minWidth: 52,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonBase,
  color: "var(--accent)",
  background: "var(--accent-soft)",
};

export default function Toolbar({
  activeTool,
  onToolChange,
  onUploadPhoto,
  onOpenStickers,
  onOpenColorPicker,
  onUndo,
  drawColor,
  drawWidth,
  onDrawWidthChange,
  canUndo,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUploadPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div
      style={{
        background: "white",
        borderTop: "1px solid #E8E8EE",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
    >
      {/* Draw options bar (visible when draw tool active) */}
      {activeTool === "draw" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            borderBottom: "1px solid #E8E8EE",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            Size
          </span>
          <input
            type="range"
            min={1}
            max={20}
            value={drawWidth}
            onChange={(e) => onDrawWidthChange(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: "var(--accent)",
              height: 4,
            }}
          />
          <div
            style={{
              width: drawWidth + 6,
              height: drawWidth + 6,
              borderRadius: "50%",
              backgroundColor: drawColor,
              flexShrink: 0,
            }}
          />
        </div>
      )}

      {/* Main toolbar buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "6px 8px",
        }}
      >
        {/* Upload Photo */}
        <button
          style={buttonBase}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          <span>Photo</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        {/* Stickers */}
        <button style={buttonBase} onClick={onOpenStickers}>
          <StickerIcon />
          <span>Stickers</span>
        </button>

        {/* Draw */}
        <button
          style={activeTool === "draw" ? activeButtonStyle : buttonBase}
          onClick={() =>
            onToolChange(activeTool === "draw" ? "select" : "draw")
          }
        >
          <DrawIcon />
          <span>Draw</span>
        </button>

        {/* Color */}
        <button style={buttonBase} onClick={onOpenColorPicker}>
          <ColorIcon color={drawColor} />
          <span>Color</span>
        </button>

        {/* Undo */}
        <button
          style={{
            ...buttonBase,
            opacity: canUndo ? 1 : 0.35,
          }}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <UndoIcon />
          <span>Undo</span>
        </button>
      </div>
    </div>
  );
}
