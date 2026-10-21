import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import LandingActions from "@/components/calls/landing-actions";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ mesa?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const savedTable = cookieStore.get("clandestino_table")?.value ?? "";
  const initialTable = params.mesa ?? savedTable;
  let tables: { id: string; number: number; name: string | null }[] = [];
  let configured = true;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("restaurant_tables").select("id,number,name").eq("is_active", true).order("number");
    if (error) throw error;
    tables = data ?? [];
  } catch { configured = false; }

  return <main className="landingPage">
    <div className="landingCard">
      <span className="landingBrand">O CLANDESTINO</span>
      <span className="landingSub">ROCK ’N’ BEER</span>
      <div className="landingOrnament">✦ ━ ❧ ━ ✦</div>
      <p className="eyebrow">BEM-VINDO</p>
      <h1>Seu momento.<br/><em>Do seu jeito.</em></h1>
      <p className="landingDescription">Escolha seu próximo favorito ou chame nossa equipe. Estamos aqui para deixar sua experiência melhor.</p>
      {!configured && <p className="notice">Configure o Supabase e execute o SQL de <code>supabase/schema.sql</code> para habilitar o atendimento.</p>}
      <LandingActions tables={tables} initialTable={initialTable}/>
      <p className="landingFootnote">Atendimento responsável, bons drinks e bons momentos.</p>
    </div>
  </main>;
}
