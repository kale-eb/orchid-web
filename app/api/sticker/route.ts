import { NextRequest, NextResponse } from "next/server";
import { getStorageBucket } from "@/lib/firebase-admin";

// Cache sticker downloads in memory (they never change)
const stickerCache = new Map<string, Uint8Array>();

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const filename = req.nextUrl.searchParams.get("filename");

    if (!category || !filename) {
      return NextResponse.json({ error: "Missing category or filename" }, { status: 400 });
    }

    // Sanitize inputs
    const safeCategory = category.toLowerCase().replace(/[^a-z]/g, "");
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    const cacheKey = `${safeCategory}/${safeFilename}`;

    // Check memory cache
    const cached = stickerCache.get(cacheKey);
    if (cached) {
      return new NextResponse(cached as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Download from Firebase Storage via Admin SDK
    const bucket = getStorageBucket().bucket();
    const file = bucket.file(`stickers/${safeCategory}/${safeFilename}`);
    const [buffer] = await file.download();

    // Cache it
    const bytes = new Uint8Array(buffer);
    stickerCache.set(cacheKey, bytes);

    return new NextResponse(bytes as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[sticker] Error:", err);
    return NextResponse.json({ error: "Sticker not found" }, { status: 404 });
  }
}
