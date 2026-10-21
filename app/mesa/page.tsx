import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CallWaiterButton from "@/components/calls/call-waiter-button";

export const dynamic = "force-dynamic";

export default async function TablePage({ searchParams }: { searchParams: Promise<{ mesa?: string }> }) {
  const { mesa } = await searchParams;
  const tableNumber = Number(mesa);
  if (!Number.isInteger(tableNumber) || tableNumber < 1) {
    return <main className="landingPage"><section className="landingCard"><h1>Selecione sua mesa</h1><p>Volte à página inicial e informe o número da mesa.</p><Link className="menuLinkButton" href="/">Voltar ao início</Link></section></main>;
  }
  let validTable = false;
  let tableId = "";
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("restaurant_tables").select("id,number").eq("number", tableNumber).eq("is_active", true).maybeSingle();
    if (data) { validTable = true; tableId = data.id; }
  } catch {}
  return <main className="landingPage"><section className="landingCard">
    <Link className="backLink" href="/">← Início</Link>
    <span className="landingBrand">O CLANDESTINO</span><span className="landingSub">ROCK ’N’ BEER</span>
    <p className="eyebrow">ATENDIMENTO À MESA</p><h1>Mesa <em>{tableNumber}</em></h1>
    {validTable ? <><p className="landingDescription">Precisa de ajuda? Avise nossa equipe. Seu chamado será enviado aos garçons disponíveis.</p><CallWaiterButton tableId={tableId} tableNumber={tableNumber}/><Link className="menuLinkButton" href="/cardapio">Ver cardápio <span>↗</span></Link></> : <><p className="notice">Essa mesa não está cadastrada ou está inativa. Confirme o número com a equipe.</p><Link className="menuLinkButton" href="/">Voltar</Link></>}
  </section></main>;
}
