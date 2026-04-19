import { useEffect, useState, useCallback } from "react";
import notificationApi from "@/api/notificationApi";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer as ArrayBuffer;
}

export function usePushNotifications() {
  const isPushSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Load VAPID public key once
  useEffect(() => {
    if (!isPushSupported) return;
    notificationApi.getVapidPublicKey().then(setVapidPublicKey).catch(() => {});
  }, [isPushSupported]);

  // Detect if already subscribed
  useEffect(() => {
    if (!isPushSupported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsPushEnabled(!!sub);
    });
  }, [isPushSupported]);

  // Re-register renewed subscription when the browser rotates the WNS/FCM channel
  useEffect(() => {
    if (!isPushSupported) return;
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "PUSH_SUBSCRIPTION_RENEWED") return;
      const json = event.data.subscription as { endpoint: string; keys: { p256dh: string; auth: string } };
      try {
        await notificationApi.subscribe({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          userAgent: navigator.userAgent,
        });
        setIsPushEnabled(true);
      } catch {
        // silently ignore — next page load will detect and re-subscribe
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [isPushSupported]);

  const subscribeToPush = useCallback(async () => {
    if (!isPushSupported || !vapidPublicKey) return;
    setSubscribeError(null);
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setSubscribeError("Notification permission was denied. Enable it in your browser settings.");
        return;
      }
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;

      // Unsubscribe any stale subscription before creating a new one.
      // If the VAPID key has changed since the old subscription was created,
      // FCM/WNS will reject the new subscribe() call with AbortError unless
      // the old subscription is explicitly cleared first.
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      await notificationApi.subscribe({
        endpoint: json.endpoint!,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });

      setIsPushEnabled(true);
    } catch (err) {
      console.error("Push subscribe failed:", err);
      setSubscribeError("Failed to enable notifications. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  }, [isPushSupported, vapidPublicKey]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!isPushSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) return;

      await notificationApi.unsubscribe(subscription.endpoint);
      await subscription.unsubscribe();
      setIsPushEnabled(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    }
  }, [isPushSupported]);

  return {
    isPushSupported,
    isPushEnabled,
    isSubscribing,
    subscribeError,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
