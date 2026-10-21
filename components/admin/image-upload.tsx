"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ImageUpload({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setMessage("Use uma imagem JPG, PNG, WebP ou GIF."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("A imagem deve ter no máximo 5 MB."); return; }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setUrl(data.publicUrl); setMessage("Imagem enviada. Salve o produto para aplicar.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao enviar imagem. Verifique o bucket e as permissões.");
    } finally { setBusy(false); }
  }

  return <div className="imageUpload"><input type="hidden" name="image_path" value={url} />
    {url ? <div className="imagePreview"><img src={url} alt="Prévia da imagem do produto" /><button type="button" className="textButton dangerText" onClick={() => { setUrl(""); setMessage("Imagem removida do cadastro; salve para aplicar."); }}>Remover foto</button></div> : <div className="uploadPlaceholder">Prévia da foto do produto</div>}
    <label className="uploadButton">{busy ? "Enviando imagem…" : "Escolher imagem"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label>
    <small className="muted">JPG, PNG ou WebP; máximo 5 MB. As imagens enviadas ficam no Supabase Storage.</small>{message && <p className={message.startsWith("Imagem enviada") ? "uploadMessage successText" : "uploadMessage"}>{message}</p>}
  </div>;
}
