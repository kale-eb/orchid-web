import { NextRequest, NextResponse } from "next/server";
import { getDb, getStorageBucket, getFcm } from "@/lib/firebase-admin";
import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

const TARGET_UID = process.env.TARGET_UID || "";

export async function POST(req: NextRequest) {
  try {
    console.log("[submit] === New submission received ===");

    const body = await req.json();
    const { image, senderName } = body;
    console.log("[submit] senderName:", senderName, "| image length:", image?.length || 0);

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      console.log("[submit] REJECTED: Invalid image data");
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }

    const name = (senderName || "").trim();
    if (!name || name.length > 30) {
      console.log("[submit] REJECTED: Bad name:", name);
      return NextResponse.json({ error: "Name required (max 30 chars)" }, { status: 400 });
    }

    console.log("[submit] TARGET_UID:", TARGET_UID);
    if (!TARGET_UID) {
      console.log("[submit] REJECTED: No TARGET_UID configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Decode base64 image
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    console.log("[submit] Image decoded, buffer size:", buffer.length, "bytes");

    // Upload to Firebase Storage
    const filename = `broadcast/${randomUUID()}.jpg`;
    const bucket = getStorageBucket().bucket();
    const file = bucket.file(filename);
    console.log("[submit] Uploading to Storage:", filename);
    await file.save(buffer, {
      metadata: { contentType: "image/jpeg" },
    });
    console.log("[submit] Upload complete");

    // Make file publicly readable and get URL
    await file.makePublic();
    const imageURL = `https://storage.googleapis.com/${bucket.name}/${filename}`;
    console.log("[submit] Public URL:", imageURL);

    // Write to Firestore broadcast doc
    console.log("[submit] Writing to Firestore: broadcast/" + TARGET_UID);
    await getDb().collection("broadcast").doc(TARGET_UID).set({
      imageURL,
      senderName: name,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("[submit] Firestore write complete");

    // Send FCM push notification
    const userDoc = await getDb().collection("users").doc(TARGET_UID).get();
    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;
    console.log("[submit] User doc exists:", userDoc.exists, "| fcmToken:", fcmToken ? fcmToken.substring(0, 20) + "..." : "NONE");
    let fcmStatus = "no_token";
    let fcmError = "";
    if (fcmToken) {
      try {
        const fcmResult = await getFcm().send({
          token: fcmToken,
          // Data-only payload so onMessageReceived fires even when app is backgrounded
          data: {
            imageURL: imageURL,
            senderName: name,
            type: "broadcast_wallpaper",
          },
          android: {
            priority: "high" as const,
          },
          apns: {
            payload: {
              aps: { sound: "default", "content-available": 1, category: "WALLPAPER_RECEIVED" },
            },
          },
        });
        fcmStatus = "sent";
        console.log("[submit] FCM sent successfully, message ID:", fcmResult);
      } catch (err: unknown) {
        fcmStatus = "error";
        fcmError = err instanceof Error ? err.message : String(err);
        console.error("[submit] FCM send FAILED:", err);
      }
    } else {
      console.log("[submit] No FCM token — skipping push");
    }

    console.log(`[submit] SUCCESS — Wallpaper from "${name}" uploaded: ${filename}`);
    return NextResponse.json({
      success: true,
      debug: { targetUid: TARGET_UID, firestoreOk: true, fcmToken: fcmToken ? "present" : "missing", fcmStatus, fcmError },
    });
  } catch (err) {
    console.error("[submit] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
