"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VideoUpload({ initialUrl = "" }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      setMessage("Use um vídeo MP4, WebM ou MOV.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setMessage("O vídeo deve ter no máximo 30 MB.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-videos").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-videos").getPublicUrl(path);
      setUrl(data.publicUrl);
      setMessage("Vídeo enviado. Salve o produto para aplicar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no envio. Verifique o bucket e as permissões.");
    } finally { setBusy(false); }
  }

  return <div className="imageUpload">
    <input type="hidden" name="video_path" value={url} />
    {url ? <div className="imagePreview"><video src={url} controls playsInline preload="metadata" /><button type="button" className="textButton dangerText" onClick={() => { setUrl(""); setMessage("Vídeo removido do cadastro; salve para aplicar."); }}>Remover vídeo</button></div> : <div className="uploadPlaceholder">Prévia do vídeo do produto</div>}
    <label className="uploadButton">{busy ? "Enviando vídeo…" : "Escolher vídeo"}<input type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label>
    <small className="muted">MP4, WebM ou MOV; máximo 30 MB. Prefira vídeos curtos e comprimidos para carregar rapidamente no celular.</small>
    {message && <p className={message.startsWith("Vídeo enviado") ? "uploadMessage successText" : "uploadMessage"}>{message}</p>}
  </div>;
}
