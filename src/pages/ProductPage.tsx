import { useState, type FormEvent } from "react";
import { Plus, SlidersHorizontal, Grid2X2, RefreshCw } from "lucide-react";
import { useProducts } from "../hooks/useProducts";
import { useResource } from "../hooks/useResource";
import { productService } from "../services/productService";
import { useAuth } from "../contexts/AuthContext";
import ProductCard from "../components/ProductCard";
import EditProductModal from "../components/EditProductModal";
import DeleteProductModal from "../components/DeleteProductModal";
import ProductBatchesModal from "../components/ProductBatchesModal";
import {
  Feedback,
  Modal,
  money,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import type { Product } from "../types/product";
export default function ProductPage() {
  const products = useProducts();
  const categories = useResource(productService.categories);
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [selected, setSelected] = useState<Product>();
  const [editingId, setEditingId] = useState<string>();
  const [deletingId, setDeletingId] = useState<string>();
  const [batchProduct, setBatchProduct] = useState<Product>();
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = (products.data || [])
    .filter(
      (p) =>
        p.productName
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")) &&
        (!category || p.categoryId === category),
    )
    .sort((a, b) =>
      sort === "price-up"
        ? a.sellingPrice - b.sellingPrice
        : sort === "price-down"
          ? b.sellingPrice - a.sellingPrice
          : a.productName.localeCompare(b.productName, "vi"),
    );
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      await productService.create({
        productName: String(form.get("name")).trim(),
        categoryId: String(form.get("category")),
        price: Number(form.get("price")),
        sellingPrice: Number(form.get("sellingPrice")),
        unit: String(form.get("unit")).trim(),
        numberOfDaysToExpire: Number(form.get("expiry")),
      });
      setCreate(false);
      setNotice("Đã thêm sản phẩm mới.");
      await products.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="DANH MỤC / SẢN PHẨM"
        title="Những món ngon mỗi ngày"
        description="Quản lý danh mục, giá bán và thông tin sản phẩm trong hệ thống."
      >
        {user?.role === "ADMIN" && (
          <button
            className="button primary"
            onClick={() => {
              setCreate(true);
              setError("");
            }}
          >
            <Plus size={18} /> Thêm sản phẩm
          </button>
        )}
      </PageTitle>
      <div className="catalog-banner">
        <div>
          <span className="eyebrow">FRESH IDEAS, EVERY DAY</span>
          <h2>
            Chất lượng bắt đầu từ
            <br />
            từng sản phẩm.
          </h2>
          <p>Một danh mục rõ ràng. Một trải nghiệm đồng nhất.</p>
        </div>
        <div className="banner-leaf">✳</div>
        <div className="banner-counter">
          <strong>{products.data?.length ?? "—"}</strong>
          <span>sản phẩm trong danh mục</span>
          <i>ĐỒNG HÀNH CÙNG CỬA HÀNG ↗</i>
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <div className="section-top">
        <h2>
          Danh sách sản phẩm <span>{products.data?.length ?? 0}</span>
        </h2>
        <button className="text-button" onClick={() => void products.reload()}>
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>
      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <select
          aria-label="Danh mục"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.data?.map((c) => (
            <option value={c.categoryId} key={c.categoryId}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sắp xếp"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="name">Tên: A → Z</option>
          <option value="price-up">Giá tăng dần</option>
          <option value="price-down">Giá giảm dần</option>
        </select>
        <span className="view-toggle">
          <Grid2X2 size={18} />
        </span>
      </div>
      {categories.error && (
        <p className="inline-error">
          Không tải được danh mục: {categories.error}{" "}
          <button
            className="text-button"
            onClick={() => void categories.reload()}
          >
            Thử lại
          </button>
        </p>
      )}
      <div className="filter-caption">
        <SlidersHorizontal size={14} />
        <span>{filtered.length} sản phẩm phù hợp</span>
        <span>Giá hiển thị bằng VNĐ</span>
      </div>
      <Feedback
        loading={products.loading}
        error={products.error}
        empty={!filtered.length}
        retry={products.reload}
      />
      {!products.loading && !products.error && (
        <>
          <div className="product-grid">
            {filtered
              .slice((current - 1) * size, current * size)
              .map((p, i) => (
                <ProductCard
                  key={p.productId}
                  product={p}
                  index={i}
                  onSelect={() => setSelected(p)}
                />
              ))}
          </div>
          <Pagination
            page={current}
            size={size}
            total={filtered.length}
            onPage={setPage}
            onSize={(v) => {
              setSize(v);
              setPage(1);
            }}
          />
        </>
      )}
      {selected && (
        <Modal title="Chi tiết sản phẩm" onClose={() => setSelected(undefined)}>
          <div className="detail-name">{selected.productName}</div>
          <dl className="detail-list">
            <dt>Mã sản phẩm</dt>
            <dd>{selected.productId}</dd>
            <dt>Danh mục</dt>
            <dd>{selected.categoryName || "Chưa phân loại"}</dd>
            <dt>Giá vốn</dt>
            <dd>{money(selected.price)}</dd>
            <dt>Giá bán</dt>
            <dd>{money(selected.sellingPrice)}</dd>
            <dt>Đơn vị</dt>
            <dd>{selected.unit || "—"}</dd>
            <dt>Hạn sử dụng</dt>
            <dd>{selected.numberOfDaysToExpire} ngày</dd>
          </dl>
          {user?.role === "ADMIN" && (
            <button
              className="button secondary"
              onClick={() => {
                setEditingId(selected.productId);
                setSelected(undefined);
                setNotice("");
              }}
            >
              Sửa sản phẩm
            </button>
          )}
          {user?.role === "ADMIN" && (
            <button
              className="button cancel-order-button"
              onClick={() => {
                setDeletingId(selected.productId);
                setSelected(undefined);
                setNotice("");
              }}
            >
              Xóa sản phẩm
            </button>
          )}
          {user?.role === "ADMIN" && (
            <button
              className="button primary"
              onClick={() => {
                setBatchProduct(selected);
                setSelected(undefined);
              }}
            >
              Xem các lô toàn hệ thống
            </button>
          )}
        </Modal>
      )}
      {batchProduct && user && (
        <ProductBatchesModal
          product={batchProduct}
          role={user.role}
          onClose={() => setBatchProduct(undefined)}
        />
      )}
      {editingId && user && (
        <EditProductModal
          id={editingId}
          role={user.role}
          onClose={() => {
            setEditingId(undefined);
            void products.reload();
          }}
          onSaved={() => {
            setEditingId(undefined);
            setNotice("Đã cập nhật sản phẩm thành công.");
            void products.reload();
          }}
        />
      )}
      {deletingId && user && (
        <DeleteProductModal
          id={deletingId}
          role={user.role}
          onClose={() => {
            setDeletingId(undefined);
            void products.reload();
          }}
          onDeleted={() => {
            setDeletingId(undefined);
            setNotice("Đã xóa sản phẩm khỏi danh mục.");
            void products.reload();
          }}
        />
      )}
      {create && (
        <Modal
          title="Thêm sản phẩm mới"
          onClose={() => {
            if (!busy) setCreate(false);
          }}
        >
          <p className="muted">
            Sản phẩm sẽ được thêm vào danh mục chung của hệ thống.
          </p>
          <form className="form-grid" onSubmit={submit}>
            <label className="full">
              Tên sản phẩm
              <input name="name" required maxLength={150} pattern=".*\S.*" />
            </label>
            <label className="full">
              Danh mục
              <select name="category" required disabled={categories.loading}>
                <option value="">Chọn danh mục</option>
                {categories.data?.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Giá vốn (VNĐ)
              <input name="price" type="number" min="0" step="100" required />
            </label>
            <label>
              Giá bán (VNĐ)
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="100"
                required
              />
            </label>
            <label>
              Đơn vị
              <input
                name="unit"
                required
                maxLength={30}
                placeholder="Phần, hộp, kg…"
              />
            </label>
            <label>
              Hạn sử dụng (ngày)
              <input name="expiry" type="number" min="0" step="1" required />
            </label>
            {error && (
              <div role="alert" className="inline-error full">
                {error}
              </div>
            )}
            <div className="modal-actions full">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setCreate(false)}
              >
                Hủy
              </button>
              <button
                className="button primary"
                disabled={busy || !categories.data?.length}
              >
                {busy ? "Đang lưu…" : "Tạo sản phẩm"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
