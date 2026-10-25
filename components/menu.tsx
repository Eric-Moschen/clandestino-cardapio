
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Product } from "@/lib/types";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Menu({
  products,
  configured,
}: {
  products: Product[];
  configured: boolean;
}) {
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

  const searchParams = useSearchParams();
  const mesa = searchParams.get("mesa");

  const chamarGarcomUrl = mesa
    ? `/mesa?mesa=${encodeURIComponent(mesa)}`
    : "/mesa";

  const categories = useMemo(
    () => [
      "Todos",
      ...Array.from(
        new Set(
          products
            .map((p) => p.categories?.name)
            .filter(Boolean) as string[]
        )
      ),
    ],
    [products]
  );

  const filtered = products.filter((p) => {
    const categoryName = p.categories?.name ?? "Outros";

    const haystack =
      `${p.name} ${p.description ?? ""} ${p.ingredients ?? ""} ${categoryName}`
        .toLocaleLowerCase("pt-BR");

    return (
      (category === "Todos" || categoryName === category) &&
      haystack.includes(query.toLocaleLowerCase("pt-BR"))
    );
  });

  useEffect(() => {
    if (!selected) return;

    const video = document.querySelector<HTMLVideoElement>(
      ".productVideo"
    );

    if (!video) return;

    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    void video.play().catch(() => {
      // O navegador pode bloquear a reprodução automática.
    });

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  return (
    <>
      <header className="hero">
        <div className="topline">
          <Link className="brand" href={chamarGarcomUrl}>
            O CLANDESTINO · ROCK ’N’ BEER
          </Link>

          <div className="menuHeaderActions">
            <Link
              className="waiterReturnButton"
              href={chamarGarcomUrl}
            >
              Chamar garçom
            </Link>

            <span className="openTag">CARDÁPIO DIGITAL</span>
          </div>
        </div>

        <div className="palm palmLeft">❧</div>
        <div className="palm palmRight">❧</div>

        <h1>Cardápio</h1>

        <p className="subtitle">
          Bebidas · Drinks · Cervejas · Bons momentos
        </p>

        <div className="ornament">
          <span>✦ ❧ ✦</span>
        </div>
      </header>

      <main className="container">
        {!configured && (
          <div className="notice">
            O projeto ainda não está conectado ao Supabase.
            Configure o arquivo <code>.env.local</code> e execute
            o SQL de <code>supabase/schema.sql</code>.
          </div>
        )}

        {configured && products.length === 0 && (
          <div className="notice">
            Nenhum produto disponível cadastrado ainda. Adicione
            produtos pelo painel depois de configurar a autenticação
            administrativa.
          </div>
        )}

        <div className="sectionHead">
          <div>
            <span className="eyebrow">ESCOLHA O SEU FAVORITO</span>
            <h2>Nosso cardápio</h2>
          </div>

          <input
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
          />
        </div>

        <nav className="categories" aria-label="Categorias">
          {categories.map((c) => (
            <button
              key={c}
              className={`cat ${category === c ? "active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </nav>

        <div className="grid">
          {filtered.map((p) => {
            const imageUrl = p.image_path?.startsWith("http")
              ? p.image_path
              : null;

            return (
              <button
                className="product"
                key={p.id}
                onClick={() => setSelected(p)}
              >
                <div className="productImage">
                  {imageUrl ? (
                    <img src={imageUrl} alt={p.name} />
                  ) : (
                    <span className="placeholder">✦</span>
                  )}
                </div>

                <div className="productBody">
                  <span className="productCategory">
                    {p.categories?.name ?? "Cardápio"}
                  </span>

                  <h3>{p.name}</h3>

                  <p>
                    {p.description ||
                      "Consulte a equipe para mais informações."}
                  </p>

                  <div className="productBottom">
                    <strong>{money(Number(p.price))}</strong>
                    <span>VER DETALHES ↗</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {configured && filtered.length === 0 && products.length > 0 && (
          <p className="empty">
            Nenhum produto encontrado nessa busca ou categoria.
          </p>
        )}

        <footer>
          Consulte nossa equipe sobre ingredientes, alergênicos e
          disponibilidade.
          <br />
          O CLANDESTINO · ROCK ’N’ BEER
        </footer>
      </main>

      {selected && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <article
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-title"
          >
            <button
              className="close"
              onClick={() => setSelected(null)}
              aria-label="Fechar"
            >
              ×
            </button>

            <div className="modalMedia">
              {selected.video_path?.startsWith("http") ? (
                <video
                  className="productVideo"
                  src={selected.video_path}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster={
                    selected.image_path?.startsWith("http")
                      ? selected.image_path
                      : undefined
                  }
                  aria-label={`Vídeo de ${selected.name}`}
                />
              ) : selected.image_path?.startsWith("http") ? (
                <img src={selected.image_path} alt={selected.name} />
              ) : (
                <span className="placeholder big">✦</span>
              )}
            </div>

            <div className="modalContent">
              <span className="eyebrow">
                {selected.categories?.name ?? "Cardápio"}
              </span>

              <h2 id="product-title">{selected.name}</h2>

              <p>
                {selected.description ||
                  "Consulte a equipe para mais informações."}
              </p>

              <div className="ingredientBlock">
                <h3>Ingredientes / composição</h3>
                <p>
                  {selected.ingredients ||
                    "Consulte a equipe para informações sobre a composição."}
                </p>
              </div>

              {selected.details && (
                <div className="ingredientBlock">
                  <h3>Detalhes</h3>
                  <p>{selected.details}</p>
                </div>
              )}

              <div className="modalBottom">
                <strong>{money(Number(selected.price))}</strong>
                <span>
                  Para pedir, fale com nossa equipe no balcão.
                </span>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
