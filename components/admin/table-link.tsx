"use client";

import { useState } from "react";

export default function TableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie o link da mesa:", url);
    }
  }
  return <div className="tableLinkCell"><a href={url} target="_blank" rel="noreferrer">{url}</a><button type="button" className="textButton" onClick={copy}>{copied ? "Copiado!" : "Copiar link"}</button></div>;
}
