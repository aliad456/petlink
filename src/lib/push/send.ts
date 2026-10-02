import "server-only";
import { createSign } from "node:crypto";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";

// Sends a notification to every device a user turned notifications on for:
// browsers (Web Push, VAPID keys) and the Android app (Firebase Cloud Messaging).
// Missing keys = that channel is off; nothing throws, so a notification problem
// never breaks the action that triggered it. Devices the push service reports
// as gone are deleted.
//
// Env: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (web) and
// FIREBASE_SERVICE_ACCOUNT (the service account JSON from Firebase, for the app).
//
// Callers have already authorized the action (an RPC succeeded); the admin
// client is used only to read the *other* party's devices, which RLS hides.

export type PushMessage = { title: string; body: string; url: string; tag?: string };

type Sub = { id: string; kind: "web" | "fcm"; endpoint: string; p256dh: string | null; auth: string | null };

export async function notifyUser(userId: string, msg: PushMessage): Promise<void> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("push_subscriptions")
      .select("id, kind, endpoint, p256dh, auth")
      .eq("user_id", userId)
      .returns<Sub[]>();
    if (!data?.length) return;
    const url = msg.url.startsWith("http") ? msg.url : `${siteUrl()}${msg.url}`;
    const gone: string[] = [];
    await Promise.all(
      data.map(async (s) => {
        const ok = s.kind === "web" ? await sendWeb(s, { ...msg, url }) : await sendFcm(s.endpoint, { ...msg, url });
        if (ok === "gone") gone.push(s.id);
      }),
    );
    if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  } catch (e) {
    console.error("push failed", e);
  }
}

// ─── Web Push ───

let vapidReady: boolean | null = null;
function vapid() {
  if (vapidReady === null) {
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    vapidReady = !!(pub && priv);
    if (vapidReady) webpush.setVapidDetails("mailto:support@heykami.co.il", pub!, priv!);
  }
  return vapidReady;
}

async function sendWeb(s: Sub, msg: PushMessage): Promise<"ok" | "gone" | "skip"> {
  if (!vapid() || !s.p256dh || !s.auth) return "skip";
  try {
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify(msg),
      { TTL: 60 * 60 * 24, urgency: "high" },
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "skip";
  }
}

// ─── Firebase Cloud Messaging (HTTP v1) ───

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
let fcmToken: { value: string; expires: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

// OAuth access token from the service account (signed JWT → token), cached ~55 min.
async function accessToken(sa: ServiceAccount) {
  if (fcmToken && fcmToken.expires > Date.now()) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claim}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`FCM auth ${res.status}`);
  const { access_token } = (await res.json()) as { access_token: string };
  fcmToken = { value: access_token, expires: Date.now() + 55 * 60_000 };
  return access_token;
}

async function sendFcm(token: string, msg: PushMessage): Promise<"ok" | "gone" | "skip"> {
  const sa = serviceAccount();
  if (!sa) return "skip";
  // Data-only, so the app builds the notification itself (also when in the background).
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken(sa)}`, "content-type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        data: { title: msg.title, body: msg.body, url: msg.url, tag: msg.tag ?? "" },
        android: { priority: "high", ttl: "86400s" },
      },
    }),
  });
  if (res.ok) return "ok";
  const text = await res.text();
  return res.status === 404 || text.includes("UNREGISTERED") ? "gone" : "skip";
}
