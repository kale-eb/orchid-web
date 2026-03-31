"use client";

import React, { useState, useEffect, useRef } from "react";
import { STICKER_CATEGORIES, getStickerUrl } from "@/lib/constants";
import type { StickerCatalogItem } from "@/lib/types";

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (item: StickerCatalogItem, imageUrl: string) => void;
}

export default function StickerPicker({
  isOpen,
  onClose,
  onSelectSticker,
}: StickerPickerProps) {
  const [catalog, setCatalog] = useState<StickerCatalogItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Load catalog on mount
  useEffect(() => {
    fetch("/sticker_catalog.json")
      .then((r) => r.json())
      .then((data: StickerCatalogItem[]) => setCatalog(data))
      .catch(() => {});
  }, []);

  // Filter stickers by category and search
  const filtered = catalog.filter((item) => {
    const matchesCategory =
      activeCategory === "All" ||
      item.categories.includes(activeCategory);
    const matchesSearch =
      search.trim() === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        ref={sheetRef}
        style={{
          background: "white",
          borderRadius: "20px 20px 0 0",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          animation: "slideUp 0.25s ease-out",
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 4px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#DDD",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 16px 8px",
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Stickers
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 24,
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px 8px",
              lineHeight: 1,
            }}
            aria-label="Close sticker picker"
          >
            x
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "0 16px 8px" }}>
          <input
            type="text"
            placeholder="Search stickers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1.5px solid #E8E8EE",
              fontSize: 14,
              outline: "none",
              background: "#F8F8FC",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "0 16px 8px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {STICKER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                background:
                  activeCategory === cat
                    ? "var(--accent)"
                    : "var(--accent-soft)",
                color:
                  activeCategory === cat ? "white" : "var(--text-primary)",
                transition: "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sticker grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 12px 16px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 6,
            }}
          >
            {filtered.map((item) => {
              const primaryCategory = item.categories[0] || "Love";
              const imageUrl = getStickerUrl(primaryCategory, item.filename);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSticker(item, imageUrl)}
                  style={{
                    background: "#F8F8FC",
                    border: "1.5px solid #E8E8EE",
                    borderRadius: 12,
                    padding: 6,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    transition: "transform 0.1s ease",
                    aspectRatio: "1",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  title={item.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={item.name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                  {item.premium && (
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        fontSize: 10,
                        background: "var(--accent)",
                        color: "white",
                        borderRadius: 4,
                        padding: "1px 4px",
                        fontWeight: 700,
                      }}
                    >
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-secondary)",
                padding: "32px 0",
                fontSize: 14,
              }}
            >
              No stickers found
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
