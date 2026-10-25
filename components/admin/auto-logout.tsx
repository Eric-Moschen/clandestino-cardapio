"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_LIMIT = 10 * 60 * 1000;

export default function AutoLogout() {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let loggingOut = false;
    let lastActivity = Date.now();

    const logout = async (reason: "timeout" | "closed" = "timeout") => {
      if (loggingOut) return;

      loggingOut = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      try {
        await createClient().auth.signOut();
      } finally {
        if (reason === "timeout") {
          window.location.replace("/admin/login?error=timeout");
        }
      }
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        void logout("timeout");
        return;
      }

      scheduleLogout();
    };

    const scheduleLogout = () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      const remaining = Math.max(
        0,
        INACTIVITY_LIMIT - (Date.now() - lastActivity)
      );

      timeout = setTimeout(checkInactivity, remaining);
    };

    const markActivity = () => {
      if (loggingOut) return;

      lastActivity = Date.now();
      scheduleLogout();
    };

    const handlePageHide = () => {
      /*
       * Tentativa de encerrar a sessão ao fechar a aba ou sair
       * da página. O navegador pode cancelar operações assíncronas
       * durante o fechamento; por isso, isso não é uma garantia.
       */
      void logout("closed");
    };

    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
      "touchmove",
      "click",
      "input",
      "change",
    ];

    events.forEach((event) => {
      window.addEventListener(event, markActivity, { passive: true });
    });

    window.addEventListener("focus", checkInactivity);
    window.addEventListener("pageshow", checkInactivity);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", checkInactivity);

    scheduleLogout();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }

      events.forEach((event) => {
        window.removeEventListener(event, markActivity);
      });

      window.removeEventListener("focus", checkInactivity);
      window.removeEventListener("pageshow", checkInactivity);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", checkInactivity);
    };
  }, []);

  return null;
}