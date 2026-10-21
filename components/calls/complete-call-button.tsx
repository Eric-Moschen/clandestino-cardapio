"use client";

import { useState } from "react";

export default function CompleteCallButton({ callId, onCompleted }: { callId: string; onCompleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function complete() {
    if (!window.confirm("Confirma que este atendimento foi finalizado?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/calls/${callId}/complete`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível finalizar o atendimento.");
      onCompleted();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao finalizar."); }
    finally { setBusy(false); }
  }
  return <div><button className="adminButton primary" type="button" onClick={complete} disabled={busy}>{busy ? "Finalizando…" : "Finalizar atendimento"}</button>{error && <small className="fieldHint errorText">{error}</small>}</div>;
}
