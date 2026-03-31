"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Image as KonvaImage,
  Line,
  Transformer,
} from "react-konva";
import Konva from "konva";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/lib/constants";
import type { CanvasSticker, DrawLine, Tool } from "@/lib/types";

interface CanvasProps {
  backgroundColor: string;
  backgroundImage: string | null;
  stickers: CanvasSticker[];
  lines: DrawLine[];
  selectedId: string | null;
  tool: Tool;
  drawColor: string;
  drawWidth: number;
  onSelectSticker: (id: string | null) => void;
  onStickerDragEnd: (id: string, x: number, y: number) => void;
  onStickerTransformEnd: (
    id: string,
    attrs: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }
  ) => void;
  onDrawLine: (line: DrawLine) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}

// Sub-component for rendering a single sticker with loaded image
function StickerNode({
  sticker,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  sticker: CanvasSticker;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (attrs: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const shapeRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = sticker.src;
    img.onload = () => setImage(img);
  }, [sticker.src]);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, image]);

  if (!image) return null;

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={sticker.x}
        y={sticker.y}
        width={sticker.width}
        height={sticker.height}
        rotation={sticker.rotation}
        scaleX={sticker.scaleX}
        scaleY={sticker.scaleY}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd(e.target.x(), e.target.y());
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          onTransformEnd({
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          rotateAnchorOffset={24}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          anchorSize={14}
          anchorCornerRadius={7}
          anchorStroke="var(--accent, #C77DBA)"
          anchorFill="#fff"
          anchorStrokeWidth={2}
          borderStroke="var(--accent, #C77DBA)"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          boundBoxFunc={(oldBox: { x: number; y: number; width: number; height: number; rotation: number }, newBox: { x: number; y: number; width: number; height: number; rotation: number }) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Sub-component for the background image
function BackgroundImage({ src }: { src: string }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => setImage(img);
  }, [src]);

  if (!image) return null;

  // Scale image to fill the canvas (cover)
  const imgRatio = image.width / image.height;
  const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

  if (imgRatio > canvasRatio) {
    // Image is wider — fit height, crop sides
    drawHeight = CANVAS_HEIGHT;
    drawWidth = CANVAS_HEIGHT * imgRatio;
    drawX = (CANVAS_WIDTH - drawWidth) / 2;
    drawY = 0;
  } else {
    // Image is taller — fit width, crop top/bottom
    drawWidth = CANVAS_WIDTH;
    drawHeight = CANVAS_WIDTH / imgRatio;
    drawX = 0;
    drawY = (CANVAS_HEIGHT - drawHeight) / 2;
  }

  return (
    <KonvaImage
      image={image}
      x={drawX}
      y={drawY}
      width={drawWidth}
      height={drawHeight}
      listening={false}
    />
  );
}

export default function Canvas({
  backgroundColor,
  backgroundImage,
  stickers,
  lines,
  selectedId,
  tool,
  drawColor,
  drawWidth,
  onSelectSticker,
  onStickerDragEnd,
  onStickerTransformEnd,
  onDrawLine,
  stageRef,
}: CanvasProps) {
  const isDrawing = useRef(false);
  const currentLine = useRef<DrawLine | null>(null);
  const [activeLine, setActiveLine] = useState<DrawLine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale to fit within available viewport space
  useEffect(() => {
    function updateScale() {
      // Available height = viewport minus header, controls, toolbar (~320px)
      const availableHeight = window.innerHeight - 320;
      // Available width = container width minus padding
      const availableWidth = containerRef.current
        ? containerRef.current.clientWidth
        : window.innerWidth - 32;
      const scaleX = availableWidth / CANVAS_WIDTH;
      const scaleY = availableHeight / CANVAS_HEIGHT;
      setScale(Math.min(scaleX, scaleY, 1)); // never scale up beyond 1
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const getPointerPos = useCallback(
    (stage: Konva.Stage) => {
      const pointer = stage.getPointerPosition();
      if (!pointer) return null;
      return {
        x: pointer.x / scale,
        y: pointer.y / scale,
      };
    },
    [scale]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool !== "draw") return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = getPointerPos(stage);
      if (!pos) return;

      isDrawing.current = true;
      const newLine: DrawLine = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        points: [pos.x, pos.y],
        color: drawColor,
        strokeWidth: drawWidth,
      };
      currentLine.current = newLine;
      setActiveLine(newLine);
    },
    [tool, drawColor, drawWidth, getPointerPos]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawing.current || tool !== "draw") return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = getPointerPos(stage);
      if (!pos || !currentLine.current) return;

      currentLine.current = {
        ...currentLine.current,
        points: [...currentLine.current.points, pos.x, pos.y],
      };
      setActiveLine({ ...currentLine.current });
    },
    [tool, getPointerPos]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !currentLine.current) return;
    isDrawing.current = false;
    onDrawLine(currentLine.current);
    currentLine.current = null;
    setActiveLine(null);
  }, [onDrawLine]);

  // Deselect when clicking empty space
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === "draw") return;
      // Only deselect if clicking on the stage background or background rect
      const clickedOnEmpty =
        e.target === e.target.getStage() ||
        e.target.getClassName() === "Rect" ||
        (e.target.getClassName() === "Image" && e.target.attrs.listening === false);
      if (clickedOnEmpty) {
        onSelectSticker(null);
      }
    },
    [tool, onSelectSticker]
  );

  const stageWidth = CANVAS_WIDTH * scale;
  const stageHeight = CANVAS_HEIGHT * scale;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: stageWidth,
          height: stageHeight,
          borderRadius: 40 * scale,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          border: "3px solid rgba(199,125,186,0.3)",
        }}
      >
        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{ touchAction: "none" }}
        >
          {/* Background layer */}
          <Layer>
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fill={backgroundColor}
              listening={true}
            />
            {backgroundImage && <BackgroundImage src={backgroundImage} />}
          </Layer>

          {/* Drawing layer */}
          <Layer>
            {lines.map((line) => (
              <Line
                key={line.id}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
                listening={false}
              />
            ))}
            {activeLine && (
              <Line
                points={activeLine.points}
                stroke={activeLine.color}
                strokeWidth={activeLine.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
                listening={false}
              />
            )}
          </Layer>

          {/* Sticker layer */}
          <Layer>
            {stickers.map((sticker) => (
              <StickerNode
                key={sticker.id}
                sticker={sticker}
                isSelected={selectedId === sticker.id}
                onSelect={() => {
                  if (tool === "select") onSelectSticker(sticker.id);
                }}
                onDragEnd={(x, y) => onStickerDragEnd(sticker.id, x, y)}
                onTransformEnd={(attrs) =>
                  onStickerTransformEnd(sticker.id, attrs)
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
