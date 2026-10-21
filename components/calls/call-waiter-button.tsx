"use client";

import { useState } from "react";

const SERVICE_TYPES = [
  { value: "duvida", label: "Tirar uma dúvida" },
  { value: "pedido", label: "Fazer pedido" },
  { value: "conta", label: "Solicitar a conta" },
  { value: "garcom", label: "Chamar o garçom" },
  { value: "talheres", label: "Talheres, guardanapo ou limpeza" },
  { value: "outro", label: "Outro atendimento" },
] as const;

export default function CallWaiterButton({ tableId, tableNumber }: { tableId: string; tableNumber: number }) {
  const [serviceType, setServiceType] = useState<string>("garcom");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function callWaiter() {
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      const response = await fetch("/api/calls", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, serviceType, details: details.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível chamar o garçom.");
      setSuccess(true);
      setMessage(result.alreadyOpen
        ? "Sua mesa já possui um atendimento em aberto. A equipe já foi avisada anteriormente."
        : result.pushConfigured
          ? "O garçom foi notificado! Sua solicitação foi enviada. Em breve, alguém atenderá sua mesa."
          : "Sua solicitação foi registrada e aparecerá no painel de atendimento da equipe. Em breve, alguém atenderá sua mesa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao enviar chamado.");
    } finally { setBusy(false); }
  }

  return <div className="callAction">
    <label className="serviceTypeLabel" htmlFor="serviceType">Como podemos ajudar?</label>
    <select id="serviceType" className="serviceTypeSelect" value={serviceType} onChange={(event) => setServiceType(event.target.value)} disabled={busy}>
      {SERVICE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
    </select>
    {serviceType === "outro" && <label className="serviceTypeLabel" htmlFor="serviceDetails">Conte brevemente o que precisa (opcional)</label>}
    {serviceType === "outro" && <textarea id="serviceDetails" className="serviceTypeSelect" rows={2} maxLength={250} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Descreva sua solicitação" />}
    <button type="button" className="callWaiterButton" onClick={callWaiter} disabled={busy}>
      {busy ? "Enviando chamado…" : "♧  Solicitar atendimento"}
    </button>
    {message && <p className={`callMessage ${success ? "successText" : ""}`} role="status" aria-live="polite">{success && <strong>{resultTitle(success)} </strong>}{message}<br/><small>Mesa {tableNumber} · {SERVICE_TYPES.find((item) => item.value === serviceType)?.label}</small></p>}
  </div>;
}

function resultTitle(success: boolean) { return success ? "✓" : ""; }
