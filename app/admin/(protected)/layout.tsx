import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import { signOutAdmin } from "@/lib/actions/auth";
import { ReactNode } from "react";
import AutoLogout from "@/components/admin/auto-logout";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();
  return <><AutoLogout /><div className="adminShell"><aside className="adminSidebar">
    <Link href="/admin" className="brandMark">O CLANDESTINO</Link><span className="adminTag">GESTÃO DO CARDÁPIO</span>
    <nav><Link href="/admin">Visão geral</Link><Link href="/admin/products">Produtos</Link><Link href="/admin/categories">Categorias</Link><Link href="/admin/tables">Mesas</Link><Link href="/admin/staff">Garçons</Link><Link href="/admin/calls">Chamados</Link><Link href="/" target="_blank">Ver página inicial ↗</Link><Link href="/cardapio" target="_blank">Ver cardápio ↗</Link></nav>
    <div className="sidebarBottom"><span title={user.email ?? "Administrador"}>{user.email}</span><form action={signOutAdmin}><button className="logoutButton" type="submit">Sair da conta</button></form></div>
  </aside><div className="adminMain"><header className="adminTopbar"><span>O Clandestino <span className="muted">/ Administração</span></span><span className="statusDot">● Sistema de gestão</span></header><main className="adminContent">{children}</main></div></div></>;
}
