"use client";

import Link from "next/link";
import { useState } from "react";

type TableOption = { id: string; number: number; name: string | null };

export default function LandingActions({ tables, initialTable }: { tables: TableOption[]; initialTable: string }) {
  const [tableId, setTableId] = useState(() => tables.find((table) => String(table.number) === initialTable)?.id ?? "");
  const [serviceType, setServiceType] = useState("garcom");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const tableFromQr = Boolean(initialTable && tables.some((table) => String(table.number) === initialTable));

  async function callWaiter() {
    if (!tableId) { setMessage("Selecione o número da sua mesa."); return; }
    setBusy(true); setMessage(""); setSuccess(false);
    const table = tables.find((item) => item.id === tableId);
    try {
      const response = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableId, serviceType }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar o chamado.");
      setSuccess(true);
      setMessage(result.alreadyOpen
        ? `A mesa ${table?.number} já possui um atendimento em aberto. A equipe já foi avisada anteriormente.`
        : result.pushConfigured
          ? "O garçom foi notificado! Sua solicitação foi enviada. Em breve, alguém atenderá sua mesa."
          : "Sua solicitação foi registrada e aparecerá no painel de atendimento da equipe. Em breve, alguém atenderá sua mesa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao enviar chamado.");
    } finally { setBusy(false); }
  }

  return <>
    <div className="tableSelectForm">
      {tableFromQr ? <p className="detectedTable">Mesa identificada: <strong>{tables.find((table) => table.id === tableId)?.number}</strong></p> : <>
        <label htmlFor="mesa">Número da mesa</label>
        <select id="mesa" value={tableId} onChange={(event) => { setTableId(event.target.value); setMessage(""); }} required>
          <option value="" disabled>Selecione sua mesa</option>
          {tables.map((table) => <option key={table.id} value={table.id}>Mesa {table.number}{table.name ? ` · ${table.name}` : ""}</option>)}
        </select>
      </>}
      <label htmlFor="serviceTypeHome">Como podemos ajudar?</label>
      <select id="serviceTypeHome" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
        <option value="duvida">Tirar uma dúvida</option><option value="pedido">Fazer pedido</option><option value="conta">Solicitar a conta</option><option value="garcom">Chamar o garçom</option><option value="talheres">Talheres, guardanapo ou limpeza</option><option value="outro">Outro atendimento</option>
      </select>
      <button className="callWaiterButton" type="button" onClick={callWaiter} disabled={busy || tables.length === 0}>
        {busy ? "Enviando chamado…" : success ? "✓ Chamado registrado" : "♧  Chamar garçom"}
      </button>
      {tables.length === 0 && <p className="callMessage">As mesas ainda não foram configuradas. Procure um funcionário.</p>}
      {message && <p className={success ? "callMessage successText" : "callMessage"} role="status">{message}</p>}
    </div>
    <Link className="menuLinkButton" href="/cardapio">Ver cardápio <span>↗</span></Link>
  </>;
}
