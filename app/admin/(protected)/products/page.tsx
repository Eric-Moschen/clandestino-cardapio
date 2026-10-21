
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  deleteProduct,
  toggleProductAvailability,
} from "@/lib/actions/catalog";

type Category = {
  name: string;
};

type ProductWithCategory = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  image_path: string | null;
  categories: Category | Category[] | null;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  let query = supabase
    .from("products")
    .select(
      "id,name,price,is_available,sort_order,image_path,categories(name)"
    )
    .order("sort_order")
    .order("name");

  if (params.status === "available") {
    query = query.eq("is_available", true);
  }

  if (params.status === "unavailable") {
    query = query.eq("is_available", false);
  }

  if (params.q?.trim()) {
    const searchTerm = params.q
      .trim()
      .replace(/[%_]/g, "\\$&");

    query = query.ilike("name", `%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar produtos:", error.message);
  }

  const products = (data ?? []) as unknown as ProductWithCategory[];

  return (
    <>
      <div className="pageHeading">
        <div>
          <p className="eyebrow">CATÁLOGO</p>
          <h1>Produtos</h1>
          <p className="muted">
            Cadastre, edite e controle a disponibilidade dos itens.
          </p>
        </div>

        <Link
          className="adminButton primary"
          href="/admin/products/new"
        >
          ＋ Novo produto
        </Link>
      </div>

      {params.saved && (
        <p className="notice success">
          {params.saved === "deleted"
            ? "Produto excluído."
            : "Alterações salvas."}
        </p>
      )}

      {params.error && (
        <p className="notice error">
          {params.error === "invalid"
            ? "Confira os campos obrigatórios e o preço."
            : "Não foi possível concluir a operação. Verifique os dados e tente novamente."}
        </p>
      )}

      <section className="adminPanel">
        <form className="filterBar" action="/admin/products">
          <label>
            Buscar produto
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Nome do produto…"
            />
          </label>

          <label>
            Status
            <select
              name="status"
              defaultValue={params.status ?? "all"}
            >
              <option value="all">Todos</option>
              <option value="available">Disponíveis</option>
              <option value="unavailable">Indisponíveis</option>
            </select>
          </label>

          <button
            className="adminButton secondary"
            type="submit"
          >
            Filtrar
          </button>

          <Link className="textButton" href="/admin/products">
            Limpar
          </Link>
        </form>

        <div className="panelHeading">
          <h2>Itens do cardápio</h2>
          <span className="countLabel">
            {products.length} resultados
          </span>
        </div>

        {products.length === 0 ? (
          <div className="emptyState">
            <h3>Nenhum produto encontrado</h3>
            <p>Adicione um produto ou altere os filtros.</p>

            <Link
              className="adminButton primary"
              href="/admin/products/new"
            >
              Cadastrar produto
            </Link>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="adminTable productTable">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => {
                  const category = Array.isArray(p.categories)
                    ? p.categories[0]
                    : p.categories;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="productCell">
                          {p.image_path ? (
                            <img src={p.image_path} alt="" />
                          ) : (
                            <span className="miniPlaceholder">
                              ✦
                            </span>
                          )}

                          <strong>{p.name}</strong>
                        </div>
                      </td>

                      <td>{category?.name ?? "—"}</td>

                      <td>
                        {Number(p.price).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </td>

                      <td>
                        <span
                          className={
                            p.is_available
                              ? "pill available"
                              : "pill unavailable"
                          }
                        >
                          {p.is_available
                            ? "Disponível"
                            : "Indisponível"}
                        </span>
                      </td>

                      <td>
                        <div className="rowActions">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                          >
                            Editar
                          </Link>

                          <form action={toggleProductAvailability}>
                            <input
                              type="hidden"
                              name="id"
                              value={p.id}
                            />
                            <input
                              type="hidden"
                              name="next"
                              value={String(!p.is_available)}
                            />

                            <button
                              className="textButton"
                              type="submit"
                            >
                              {p.is_available
                                ? "Indisponibilizar"
                                : "Disponibilizar"}
                            </button>
                          </form>

                          <form action={deleteProduct}>
                            <input
                              type="hidden"
                              name="id"
                              value={p.id}
                            />

                            <button
                              className="textButton dangerText"
                              type="submit"
                            >
                              Excluir
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
