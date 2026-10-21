import Link from "next/link";
import ImageUpload from "@/components/admin/image-upload";
import VideoUpload from "@/components/admin/video-upload";
import { saveProduct } from "@/lib/actions/catalog";
import type { Category, Product } from "@/lib/types";

export default function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const action = saveProduct;
  return <form action={action} className="productForm">
    {product && <input type="hidden" name="id" value={product.id} />}
    <div className="formColumns"><div className="formMainColumn">
      <section className="adminPanel formSection"><div className="panelHeading"><div><h2>Informações do produto</h2><p className="muted">Os campos com * são obrigatórios.</p></div></div>
        <label>Nome do produto *<input name="name" defaultValue={product?.name ?? ""} maxLength={120} placeholder="Ex.: Clandestino Burger" required /></label>
        <label>Categoria *<select name="category_id" defaultValue={product?.category_id ?? ""} required><option value="" disabled>Selecione uma categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.sort_order < 0 ? "" : ""}</option>)}</select>{categories.length === 0 && <small className="fieldHint">Você precisa <Link href="/admin/categories">cadastrar uma categoria</Link> antes de criar produtos.</small>}</label>
        <label>Descrição curta<textarea name="description" defaultValue={product?.description ?? ""} maxLength={500} rows={3} placeholder="Uma descrição para apresentar o produto no cardápio." /></label>
        <label>Ingredientes<textarea name="ingredients" defaultValue={product?.ingredients ?? ""} maxLength={1000} rows={3} placeholder="Ex.: pão brioche, hambúrguer, queijo, molho da casa…" /></label>
        <label>Detalhes adicionais<textarea name="details" defaultValue={product?.details ?? ""} maxLength={2000} rows={3} placeholder="Observações ou detalhes adicionais para a tela do produto." /></label>
      </section>
    </div><div className="formSideColumn">
      <section className="adminPanel formSection"><div className="panelHeading"><h2>Preço e publicação</h2></div>
        <label>Preço (R$) *<input name="price" type="number" min="0" step="0.01" defaultValue={product ? Number(product.price).toFixed(2) : ""} placeholder="29,90" required /></label>
        <label>Ordem de exibição<input name="sort_order" type="number" step="1" defaultValue={product?.sort_order ?? 0} /><small className="fieldHint">Menor número aparece primeiro.</small></label>
        <label className="checkField"><input type="checkbox" name="is_available" defaultChecked={product?.is_available ?? true} /> Disponível para clientes</label>
      </section>
      <section className="adminPanel formSection"><div className="panelHeading"><h2>Foto do produto</h2></div><ImageUpload initialUrl={product?.image_path?.startsWith("http") ? product.image_path : ""} /></section>
      <section className="adminPanel formSection"><div className="panelHeading"><h2>Vídeo curto do produto</h2></div><VideoUpload initialUrl={product?.video_path?.startsWith("http") ? product.video_path : ""} /></section>
    </div></div>
    <div className="formFooter"><Link className="adminButton secondary" href="/admin/products">Cancelar</Link><button className="adminButton primary" type="submit">{product ? "Salvar alterações" : "Cadastrar produto"}</button></div>
  </form>;
}
