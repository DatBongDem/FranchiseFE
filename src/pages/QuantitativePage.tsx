import { useRef, useState, type FormEvent } from "react";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  quantitativeService,
  validateQuantitative,
  type Quantitative,
} from "../services/quantitativeService";
import {
  Feedback,
  Modal,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import type { User } from "../types/user";
function Editor({
  item,
  user,
  onClose,
  onSaved,
}: {
  item: Quantitative;
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(item.quantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    try {
      validateQuantitative(Number(value));
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await quantitativeService.update(user, item, Number(value));
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Cập nhật định mức sản phẩm"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="recipe-editor" onSubmit={submit}>
        <p>
          <strong>{item.productName}</strong>
        </p>
        <p>Định mức hiện tại: {item.quantity.toLocaleString("vi-VN")}</p>
        <label className="recipe-description">
          Định mức mới
          <input
            type="number"
            required
            min="1"
            max="2147483647"
            step="1"
            value={value}
            disabled={busy || blocked}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <p>Thay đổi áp dụng cho cửa hàng được phân công trong tài khoản.</p>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            className="button primary"
            disabled={busy || blocked || Number(value) === item.quantity}
          >
            {busy ? "Đang lưu…" : "Lưu định mức"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function QuantitativePage() {
  const { user } = useAuth();
  const resource = useResource(
    () => quantitativeService.list(user!),
    [user!.role, user!.idStore],
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [selected, setSelected] = useState<Quantitative>();
  const [notice, setNotice] = useState("");
  const text = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  const rows = (resource.data || [])
    .filter(
      (r) =>
        text(r.productName).includes(text(search.trim())) ||
        r.productId.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort === "asc"
          ? a.quantity - b.quantity
          : sort === "desc"
            ? b.quantity - a.quantity
            : 0) || a.productName.localeCompare(b.productName, "vi"),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  return (
    <>
      <PageTitle
        eyebrow="CỬA HÀNG / ĐỊNH MỨC"
        title="Định mức sản phẩm"
        description="Xem và cập nhật số lượng định mức đã thiết lập cho từng sản phẩm của cửa hàng."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Tải lại
        </button>
      </PageTitle>
      <div className="recipe-banner">
        <SlidersHorizontal size={32} />
        <div>
          <strong>
            Cửa hàng #{user!.idStore?.slice(0, 8).toUpperCase() || "—"}
          </strong>
          <p>
            Định mức là cấu hình sản phẩm, không phải số lượng tồn kho. Chỉ cập
            nhật các dòng đã có trong hệ thống.
          </p>
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Danh sách định mức</h2>
          <span>{rows.length} sản phẩm phù hợp</span>
        </div>
        <div className="toolbar wrap">
          <SearchInput
            value={search}
            onChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            placeholder="Tìm tên hoặc mã sản phẩm…"
          />
          <select
            aria-label="Sắp xếp định mức"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="name">Tên A → Z</option>
            <option value="asc">Định mức tăng dần</option>
            <option value="desc">Định mức giảm dần</option>
          </select>
        </div>
        <Feedback
          loading={resource.loading}
          error={resource.error}
          empty={!rows.length}
          retry={resource.reload}
        />
        {!resource.loading && !resource.error && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>ĐỊNH MỨC</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * size, current * size).map((r) => (
                    <tr key={r.productId}>
                      <td>
                        <strong>{r.productName}</strong>
                        <small>{r.productId}</small>
                      </td>
                      <td>{r.quantity.toLocaleString("vi-VN")}</td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setNotice("");
                            setSelected(r);
                          }}
                        >
                          Cập nhật
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={current}
              size={size}
              total={rows.length}
              onPage={setPage}
              onSize={(s) => {
                setSize(s);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
      {selected && (
        <Editor
          item={selected}
          user={user!}
          onClose={() => {
            setSelected(undefined);
            void resource.reload();
          }}
          onSaved={() => {
            setSelected(undefined);
            setNotice("Đã cập nhật và kiểm tra lại định mức thành công.");
            void resource.reload();
          }}
        />
      )}
    </>
  );
}
