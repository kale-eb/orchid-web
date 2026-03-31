"use client";

import React from "react";
import { COLOR_PRESETS } from "@/lib/constants";

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  label?: string;
}

export default function ColorPicker({
  selectedColor,
  onColorChange,
  label,
}: ColorPickerProps) {
  return (
    <div style={{ padding: "12px 16px" }}>
      {label && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 8,
        }}
      >
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: color,
              border:
                selectedColor === color
                  ? "3px solid var(--accent)"
                  : "2px solid rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "transform 0.15s ease",
              transform: selectedColor === color ? "scale(1.15)" : "scale(1)",
              boxShadow:
                selectedColor === color
                  ? "0 2px 8px rgba(199,125,186,0.4)"
                  : "none",
            }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  );
}
