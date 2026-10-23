import { useState, type FormEvent } from "react";
import { Leaf, Plus, RefreshCw } from "lucide-react";
import { operationsService } from "../services/operationsService";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../contexts/AuthContext";
import {
  Feedback,
  Modal,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
export default function IngredientsPage() {
  const resource = useResource(operationsService.ingredients);
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const rows = (resource.data || [])
    .filter((i) =>
      i.ingredientName
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
    )
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, "vi"));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await operationsService.createIngredient(
        String(f.get("name")).trim(),
        String(f.get("unit")).trim(),
      );
      setOpen(false);
      setNotice("Đã thêm nguyên liệu thành công.");
      await resource.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CĂN BẾP / NGUYÊN LIỆU"
        title="Từ những điều tươi ngon"
        description="Danh mục nguyên liệu dùng cho công thức và hoạt động chế biến."
      >
        {user?.role === "ADMIN" && (
          <button
            className="button primary"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            <Plus size={18} /> Thêm nguyên liệu
          </button>
        )}
      </PageTitle>
      <div className="ingredient-intro">
        <Leaf size={38} strokeWidth={1.4} />
        <div>
          <h2>Nguyên liệu tốt, món ăn ngon.</h2>
          <p>
            {resource.data?.length ?? 0} nguyên liệu đang có trong danh mục dùng
            chung.
          </p>
        </div>
        <span>FRESH & SIMPLE</span>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>Danh mục nguyên liệu</h2>
          <button
            className="text-button"
            onClick={() => void resource.reload()}
          >
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
                    <th>NGUYÊN LIỆU</th>
                    <th>MÃ NGUYÊN LIỆU</th>
                    <th>ĐƠN VỊ TÍNH</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * size, current * size).map((i) => (
                    <tr key={i.ingredientId}>
                      <td>
                        <div className="name-cell">
                          <span className="leaf-icon">
                            <Leaf size={19} />
                          </span>
                          <strong>{i.ingredientName}</strong>
                        </div>
                      </td>
                      <td className="muted">{i.ingredientId}</td>
                      <td>
                        <span className="unit-pill">{i.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={current}
              total={rows.length}
              size={size}
              onPage={setPage}
              onSize={(v) => {
                setSize(v);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
      {open && (
        <Modal
          title="Thêm nguyên liệu"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={submit}>
            <label>
              Tên nguyên liệu
              <input
                name="name"
                required
                maxLength={150}
                pattern=".*\S.*"
                placeholder="Ví dụ: Cà chua"
              />
            </label>
            <label>
              Đơn vị tính
              <input
                name="unit"
                required
                maxLength={30}
                pattern=".*\S.*"
                placeholder="Ví dụ: kg, lít, quả"
              />
            </label>
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
                onClick={() => setOpen(false)}
              >
                Hủy
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Đang lưu…" : "Thêm nguyên liệu"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
