"use client";

import { useState } from "react";

export default function ClaimCallButton({ callId, onClaimed }: { callId: string; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function claim() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/calls/${callId}/claim`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível aceitar.");
      onClaimed();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao aceitar."); }
    finally { setBusy(false); }
  }
  return <div><button className="adminButton primary" type="button" onClick={claim} disabled={busy}>{busy ? "Aceitando…" : "Aceitar chamado"}</button>{error && <small className="fieldHint errorText">{error}</small>}</div>;
}
