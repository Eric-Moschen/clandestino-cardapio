"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_LIMIT = 10 * 60 * 1000;
const SESSION_KEY = "clandestino_admin_tab_session";

export default function AutoLogout() {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let loggingOut = false;
    let lastActivity = Date.now();

    const logout = async () => {
      if (loggingOut) return;
      loggingOut = true;

      if (timeout) clearTimeout(timeout);

      sessionStorage.removeItem(SESSION_KEY);

      try {
        await createClient().auth.signOut();
      } finally {
        window.location.replace("/admin/login?error=timeout");
      }
    };

    const url = new URL(window.location.href);

    if (url.searchParams.get("sessionStart") === "1") {
      sessionStorage.setItem(SESSION_KEY, "1");
      url.searchParams.delete("sessionStart");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    } else if (sessionStorage.getItem(SESSION_KEY) !== "1") {
      void logout();
      return;
    }

    const scheduleLogout = () => {
      if (timeout) clearTimeout(timeout);

      const remaining = Math.max(
        0,
        INACTIVITY_LIMIT - (Date.now() - lastActivity)
      );

      timeout = setTimeout(checkInactivity, remaining);
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        void logout();
      } else {
        scheduleLogout();
      }
    };

    const markActivity = () => {
      if (loggingOut) return;
      lastActivity = Date.now();
      scheduleLogout();
    };

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "input",
      "change",
    ];

    events.forEach((event) =>
      window.addEventListener(event, markActivity, { passive: true })
    );

    window.addEventListener("focus", checkInactivity);
    document.addEventListener("visibilitychange", checkInactivity);

    scheduleLogout();

    return () => {
      if (timeout) clearTimeout(timeout);

      events.forEach((event) =>
        window.removeEventListener(event, markActivity)
      );

      window.removeEventListener("focus", checkInactivity);
      document.removeEventListener("visibilitychange", checkInactivity);
    };
  }, []);

  return null;
}