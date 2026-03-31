"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Konva from "konva";
import type {
  CanvasSticker,
  DrawLine,
  Tool,
  StickerCatalogItem,
  CanvasAction,
} from "@/lib/types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_STICKER_SIZE,
  DEFAULT_DRAW_COLOR,
  DEFAULT_DRAW_WIDTH,
} from "@/lib/constants";
import Toolbar from "@/components/Toolbar";
import StickerPicker from "@/components/StickerPicker";
import ColorPicker from "@/components/ColorPicker";

// Dynamic import Canvas with SSR disabled (Konva needs DOM)
const Canvas = dynamic(() => import("@/components/Canvas"), { ssr: false });

// ---- Leaf SVG icon ----
function LeafIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66L6 22a7 7 0 0 0 6-4.48c.6-1.4.85-3.12.52-5.52" />
      <path d="M2 2s7.286 5 12 5c1.818 0 3.564-.357 5-.999" />
    </svg>
  );
}

const EMAIL_KEY = "orchid_email";
const NAME_KEY = "orchid_name";

export default function HomePage() {
  // Email gate
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Canvas state
  const [backgroundColor, setBackgroundColor] = useState("#FFE8F0");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [stickers, setStickers] = useState<CanvasSticker[]>([]);
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [drawColor, setDrawColor] = useState(DEFAULT_DRAW_COLOR);
  const [drawWidth, setDrawWidth] = useState(DEFAULT_DRAW_WIDTH);

  // UI state
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerMode, setColorPickerMode] = useState<"draw" | "background">("draw");
  const [senderName, setSenderName] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Undo history
  const [history, setHistory] = useState<CanvasAction[]>([]);

  const stageRef = useRef<Konva.Stage | null>(null);

  // Check if already submitted email
  useEffect(() => {
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved) {
      setEmailSubmitted(true);
      setSenderName(localStorage.getItem(NAME_KEY) || saved.split("@")[0]);
    }
  }, []);

  const handleEmailSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email");
      return;
    }
    const name = senderName.trim();
    if (!name) {
      setEmailError("Please enter a nickname");
      return;
    }
    setEmailError(null);
    setEmailLoading(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong");
      }
      localStorage.setItem(EMAIL_KEY, trimmed);
      localStorage.setItem(NAME_KEY, name);
      setEmailSubmitted(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEmailLoading(false);
    }
  };

  // ---- Actions ----

  const pushHistory = useCallback((action: CanvasAction) => {
    setHistory((prev) => [...prev, action]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const lastAction = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      switch (lastAction.type) {
        case "add-sticker":
          setStickers((s) => s.filter((st) => st.id !== lastAction.sticker.id));
          break;
        case "add-line":
          setLines((l) => l.filter((ln) => ln.id !== lastAction.line.id));
          break;
        case "set-background-color":
          setBackgroundColor(lastAction.prevColor);
          break;
        case "set-background-image":
          setBackgroundImage(lastAction.prevImage);
          break;
      }

      return rest;
    });
  }, []);

  const handleAddSticker = useCallback(
    (item: StickerCatalogItem, imageUrl: string) => {
      const newSticker: CanvasSticker = {
        id: `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        catalogId: item.id,
        src: imageUrl,
        x: CANVAS_WIDTH / 2 - DEFAULT_STICKER_SIZE / 2 + Math.random() * 40 - 20,
        y: CANVAS_HEIGHT / 2 - DEFAULT_STICKER_SIZE / 2 + Math.random() * 40 - 20,
        width: DEFAULT_STICKER_SIZE,
        height: DEFAULT_STICKER_SIZE,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      };
      setStickers((s) => [...s, newSticker]);
      pushHistory({ type: "add-sticker", sticker: newSticker });
      setStickerPickerOpen(false);
      setTool("select");
      setSelectedId(newSticker.id);
    },
    [pushHistory]
  );

  const handleDrawLine = useCallback(
    (line: DrawLine) => {
      setLines((l) => [...l, line]);
      pushHistory({ type: "add-line", line });
    },
    [pushHistory]
  );

  const handleUploadPhoto = useCallback(
    (dataUrl: string) => {
      // Add uploaded photo as a large, moveable/resizable sticker
      const img = new window.Image();
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        let w: number, h: number;
        // Size to fit within the canvas with some margin so handles are visible
        const FIT = 0.85;
        if (imgRatio > canvasRatio) {
          w = CANVAS_WIDTH * FIT;
          h = w / imgRatio;
        } else {
          h = CANVAS_HEIGHT * FIT;
          w = h * imgRatio;
        }
        const newSticker: CanvasSticker = {
          id: `photo-${Date.now()}`,
          catalogId: "uploaded-photo",
          src: dataUrl,
          x: (CANVAS_WIDTH - w) / 2,
          y: (CANVAS_HEIGHT - h) / 2,
          width: w,
          height: h,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        };
        setStickers((s) => [newSticker, ...s]); // insert at bottom (behind other stickers)
        pushHistory({ type: "add-sticker", sticker: newSticker });
        setTool("select");
        setSelectedId(newSticker.id);
      };
      img.src = dataUrl;
    },
    [pushHistory]
  );

  const handleBackgroundColorChange = useCallback(
    (color: string) => {
      pushHistory({
        type: "set-background-color",
        prevColor: backgroundColor,
        newColor: color,
      });
      setBackgroundColor(color);
      setBackgroundImage(null); // clear image when picking a bg color
    },
    [backgroundColor, pushHistory]
  );

  const handleStickerDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setStickers((s) =>
        s.map((st) => (st.id === id ? { ...st, x, y } : st))
      );
    },
    []
  );

  const handleStickerTransformEnd = useCallback(
    (
      id: string,
      attrs: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }
    ) => {
      setStickers((s) =>
        s.map((st) => (st.id === id ? { ...st, ...attrs } : st))
      );
    },
    []
  );

  // Delete selected sticker with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !(e.target instanceof HTMLInputElement)
      ) {
        setStickers((s) => s.filter((st) => st.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  // ---- Send / Export ----

  const handleSend = async () => {
    if (!stageRef.current) return;
    if (!senderName.trim()) {
      setError("Please enter your name!");
      return;
    }

    setError(null);
    setSending(true);

    try {
      // Deselect to hide transformer before export
      setSelectedId(null);
      // Small delay to let the transformer unmount
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = stageRef.current.toDataURL({
        mimeType: "image/jpeg",
        quality: 0.9,
        pixelRatio: 2,
      });

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          senderName: senderName.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send wallpaper");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  // ---- Color picker mode handling ----
  const handleOpenColorPicker = () => {
    setColorPickerMode("draw");
    setColorPickerOpen(true);
  };

  // ---- Email gate screen ----
  if (!emailSubmitted) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          gap: 16,
        }}
      >
        <LeafIcon />
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--accent)",
            margin: 0,
          }}
        >
          Orchid
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            maxWidth: 300,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {"Create a wallpaper and send it straight to my phone. Enter your email to get started! (we need to make sure you're a real person)"}
        </p>
        <div style={{ width: "100%", maxWidth: 320, display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            placeholder="Your nickname"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            maxLength={30}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1.5px solid #E8E8EE",
              fontSize: 16,
              outline: "none",
              background: "white",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          />
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleEmailSubmit(); }}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1.5px solid #E8E8EE",
              fontSize: 16,
              outline: "none",
              background: "white",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          />
          <button
            onClick={handleEmailSubmit}
            disabled={emailLoading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 16,
              fontWeight: 700,
              cursor: emailLoading ? "not-allowed" : "pointer",
              opacity: emailLoading ? 0.7 : 1,
            }}
          >
            {emailLoading ? "..." : "Let me in"}
          </button>
          {emailError && (
            <p style={{ color: "#E74C3C", fontSize: 13, fontWeight: 600, margin: 0 }}>
              {emailError}
            </p>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "8px 0 0", opacity: 0.6 }}>
          Just a quick verification — no spam, ever.
        </p>
      </div>
    );
  }

  // ---- Success screen ----
  if (success) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1 }}>
          {/* Flower character */}
          <span role="img" aria-label="celebration">
            &#127804;
          </span>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--accent)",
            margin: 0,
          }}
        >
          Wallpaper Sent!
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          {"Want to hijack your partner's or friend's wallpaper anytime you want? Download Orchid and take over their screen."}
        </p>
        <a
          href="https://apps.apple.com/app/apple-store/id6761027422?pt=128694142&ct=hijack-my-wallpaper&mt=8"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 28px",
            borderRadius: 16,
            background: "var(--accent)",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(199,125,186,0.4)",
          }}
        >
          <LeafIcon />
          Download Orchid
        </a>
        <button
          onClick={() => {
            setSuccess(false);
            setStickers([]);
            setLines([]);
            setBackgroundImage(null);
            setBackgroundColor("#FFE8F0");
            setHistory([]);
            setSenderName("");
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: 14,
            cursor: "pointer",
            textDecoration: "underline",
            padding: "8px",
          }}
        >
          Create another wallpaper
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "12px 16px 4px",
        }}
      >
        <LeafIcon />
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--accent)",
            margin: 0,
          }}
        >
          Orchid
        </h1>
      </header>

      <p
        style={{
          textAlign: "center",
          fontSize: 14,
          color: "var(--text-secondary)",
          margin: "0 0 8px",
          fontWeight: 500,
        }}
      >
        Set my wallpaper!
      </p>

      {/* Canvas area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 16px",
        }}
      >
        <Canvas
          backgroundColor={backgroundColor}
          backgroundImage={backgroundImage}
          stickers={stickers}
          lines={lines}
          selectedId={selectedId}
          tool={tool}
          drawColor={drawColor}
          drawWidth={drawWidth}
          onSelectSticker={setSelectedId}
          onStickerDragEnd={handleStickerDragEnd}
          onStickerTransformEnd={handleStickerTransformEnd}
          onDrawLine={handleDrawLine}
          stageRef={stageRef}
        />
      </div>

      {/* Background color row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px 4px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          BG
        </span>
        {[
          "#FFE8F0",
          "#E0D4FF",
          "#D4F0E0",
          "#FFF3D4",
          "#D4E8FF",
          "#FFD4D4",
          "#F0E0FF",
          "#FFFFFF",
        ].map((c) => (
          <button
            key={c}
            onClick={() => handleBackgroundColorChange(c)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: c,
              border:
                backgroundColor === c && !backgroundImage
                  ? "2.5px solid var(--accent)"
                  : "1.5px solid rgba(0,0,0,0.1)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "transform 0.1s",
              transform:
                backgroundColor === c && !backgroundImage
                  ? "scale(1.15)"
                  : "scale(1)",
            }}
            aria-label={`Background color ${c}`}
          />
        ))}
      </div>

      {/* Send button */}
      <div
        style={{
          padding: "8px 16px",
        }}
      >
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 12,
            border: "none",
            background: "var(--accent)",
            color: "white",
            fontSize: 15,
            fontWeight: 700,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending ? 0.7 : 1,
            transition: "all 0.15s ease",
          }}
        >
          {sending ? "Sending..." : `Send as ${senderName || "Anonymous"}`}
        </button>
      </div>

      {error && (
        <p
          style={{
            color: "#E74C3C",
            fontSize: 13,
            textAlign: "center",
            margin: "0 16px 4px",
            fontWeight: 600,
          }}
        >
          {error}
        </p>
      )}

      {/* Toolbar */}
      <Toolbar
        activeTool={tool}
        onToolChange={setTool}
        onUploadPhoto={handleUploadPhoto}
        onOpenStickers={() => setStickerPickerOpen(true)}
        onOpenColorPicker={handleOpenColorPicker}
        onUndo={handleUndo}
        drawColor={drawColor}
        drawWidth={drawWidth}
        onDrawWidthChange={setDrawWidth}
        canUndo={history.length > 0}
      />

      {/* Sticker Picker */}
      <StickerPicker
        isOpen={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        onSelectSticker={handleAddSticker}
      />

      {/* Color Picker overlay */}
      {colorPickerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setColorPickerOpen(false);
          }}
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
            style={{
              background: "white",
              borderRadius: "20px 20px 0 0",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
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

            {/* Tab toggle: Draw color vs Background color */}
            <div
              style={{
                display: "flex",
                gap: 0,
                margin: "0 16px 4px",
                borderRadius: 10,
                overflow: "hidden",
                border: "1.5px solid #E8E8EE",
              }}
            >
              {(["draw", "background"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setColorPickerMode(mode)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    background:
                      colorPickerMode === mode
                        ? "var(--accent)"
                        : "transparent",
                    color:
                      colorPickerMode === mode
                        ? "white"
                        : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  {mode === "draw" ? "Draw Color" : "Background"}
                </button>
              ))}
            </div>

            <ColorPicker
              selectedColor={
                colorPickerMode === "draw" ? drawColor : backgroundColor
              }
              onColorChange={(c) => {
                if (colorPickerMode === "draw") {
                  setDrawColor(c);
                } else {
                  handleBackgroundColorChange(c);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
