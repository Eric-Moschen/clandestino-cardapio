"use client";

import { useState } from "react";

function decodeKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalledPwa() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export default function EnablePush() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);

  async function testNotification() {
    setTesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST", credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar a notificação de teste.");
      setMessage("Notificação de teste enviada. Se ela não aparecer, confira as permissões do sistema e se o modo Não Perturbe está ativo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao testar notificações.");
    } finally {
      setTesting(false);
    }
  }

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      if (!window.isSecureContext && location.hostname !== "localhost") {
        throw new Error("As notificações exigem HTTPS. Abra o endereço seguro do site.");
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Este navegador não oferece suporte a notificações push. Atualize o navegador ou use outro compatível.");
      }

      const ios = isIosDevice();
      if (ios && !isInstalledPwa()) {
        setMessage("No iPhone/iPad: abra este site no Safari, toque em Compartilhar → Adicionar à Tela de Início e abra o ícone instalado. Depois volte aqui para ativar as notificações. O recurso exige iOS/iPadOS 16.4 ou posterior.");
        return;
      }

      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key || key.includes("CHAVE_PUBLICA")) {
        throw new Error("As notificações ainda não estão configuradas no servidor: falta NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
      }

      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") {
        throw new Error("Permissão negada. Ative as notificações nas configurações do navegador/aplicativo e tente novamente.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const currentKey = subscription.options.applicationServerKey;
        const expectedKey = decodeKey(key);
        const currentBytes = currentKey ? new Uint8Array(currentKey) : null;
        const keyMatches = currentBytes && currentBytes.length === expectedKey.length &&
          currentBytes.every((byte, index) => byte === expectedKey[index]);
        if (!keyMatches) {
          await subscription.unsubscribe();
          subscription = null;
        }
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeKey(key) as BufferSource,
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(subscription),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar este aparelho no sistema.");

      setEnabled(true);
      setMessage("Notificações ativadas neste aparelho. Deixe a permissão habilitada nas configurações do sistema.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao ativar notificações.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pushSetup" aria-live="polite">
      <button className="adminButton secondary" onClick={enable} disabled={busy || enabled} type="button">
        {busy ? "Configurando…" : enabled ? "Notificações ativadas neste aparelho" : "Ativar notificações neste celular"}
      </button>
      {enabled && <button className="adminButton secondary" onClick={testNotification} disabled={testing} type="button">{testing ? "Enviando teste…" : "Enviar notificação de teste"}</button>}
      {message && <p className="muted" role="status">{message}</p>}
      <p className="muted">Android: use Chrome e permita as notificações. iPhone/iPad: use iOS/iPadOS 16.4 ou posterior, adicione o site à Tela de Início e abra o ícone instalado antes de ativar.</p>
    </section>
  );
}
