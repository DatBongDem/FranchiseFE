import { useState, type FormEvent } from "react";
import { RefreshCw, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { categoryService, type Category } from "../services/categoryService";
import {
  Feedback,
  Modal,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";

export default function CategoriesPage() {
  const resource = useResource(categoryService.getAll);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [notice, setNotice] = useState("");

  // Create state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit state
  const [editing, setEditing] = useState<Category>();
  const [editName, setEditName] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete state
  const [deleting, setDeleting] = useState<Category>();
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const rows = (resource.data || []).filter((c) =>
    c.categoryName.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      await categoryService.create(newName.trim());
      setCreating(false);
      setNewName("");
      setNotice(`Đã tạo danh mục "${newName.trim()}".`);
      void resource.reload();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    setEditBusy(true);
    setEditError("");
    try {
      await categoryService.update(editing.categoryId, editName.trim());
      setNotice(`Đã cập nhật danh mục thành "${editName.trim()}".`);
      setEditing(undefined);
      void resource.reload();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await categoryService.delete(deleting.categoryId);
      setNotice(`Đã xóa danh mục "${deleting.categoryName}".`);
      setDeleting(undefined);
      void resource.reload();
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="HỆ THỐNG / DANH MỤC"
        title="Quản lý danh mục"
        description="Tổ chức sản phẩm theo danh mục để dễ dàng tra cứu và quản lý."
      >
        <button className="button primary" onClick={() => { setNotice(""); setCreating(true); setNewName(""); setCreateError(""); }}>
          <Plus size={16} /> Thêm danh mục
        </button>
        <button className="button secondary" onClick={() => void resource.reload()}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </PageTitle>

      <div className="mini-stats">
        <div>
          <span>Tổng danh mục</span>
          <b>{resource.data?.length ?? 0}</b>
        </div>
        <div>
          <span>Đang hiển thị</span>
          <b>{rows.length}</b>
        </div>
      </div>

      {notice && <div className="notice" role="status">{notice}</div>}

      <section className="panel">
        <div className="panel-heading">
          <h2>
            Danh sách danh mục{" "}
            <span className="count">{resource.data?.length ?? 0}</span>
          </h2>
          <Tag size={20} color="#28704c" />
        </div>
        <div className="toolbar">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Tìm tên danh mục…"
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
            <div className="category-grid">
              {rows.slice((current - 1) * size, current * size).map((c) => (
                <div key={c.categoryId} className="category-card">
                  <div className="category-card-icon">
                    <Tag size={20} />
                  </div>
                  <div className="category-card-body">
                    <strong>{c.categoryName}</strong>
                    <small className="muted">{c.categoryId.slice(0, 8).toUpperCase()}</small>
                  </div>
                  <div className="category-card-actions">
                    <button
                      className="icon-button"
                      title="Sửa"
                      onClick={() => { setNotice(""); setEditing(c); setEditName(c.categoryName); setEditError(""); }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-button danger-icon"
                      title="Xóa"
                      onClick={() => { setNotice(""); setDeleting(c); setDeleteError(""); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={current}
              total={rows.length}
              size={size}
              onPage={setPage}
              onSize={(v) => { setSize(v); setPage(1); }}
            />
          </>
        )}
      </section>

      {/* Create Modal */}
      {creating && (
        <Modal title="Thêm danh mục" onClose={() => setCreating(false)}>
          <form onSubmit={(e) => void handleCreate(e)}>
            <div className="modal-body">
              <label className="field">
                <span>Tên danh mục <span className="required">*</span></span>
                <input
                  id="create-category-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Đồ uống, Bánh mì, …"
                  required
                  autoFocus
                />
              </label>
              {createError && <p className="inline-error" role="alert">{createError}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="button secondary" disabled={createBusy} onClick={() => setCreating(false)}>Hủy</button>
              <button type="submit" className="button primary" disabled={createBusy || !newName.trim()}>
                {createBusy ? "Đang tạo…" : "Tạo danh mục"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title={`Sửa: ${editing.categoryName}`} onClose={() => setEditing(undefined)}>
          <form onSubmit={(e) => void handleEdit(e)}>
            <div className="modal-body">
              <label className="field">
                <span>Tên danh mục <span className="required">*</span></span>
                <input
                  id="edit-category-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              {editError && <p className="inline-error" role="alert">{editError}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="button secondary" disabled={editBusy} onClick={() => setEditing(undefined)}>Hủy</button>
              <button type="submit" className="button primary" disabled={editBusy || !editName.trim()}>
                {editBusy ? "Đang lưu…" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleting && (
        <Modal title="Xóa danh mục" onClose={() => setDeleting(undefined)}>
          <div className="modal-body">
            <p>
              Bạn có chắc muốn xóa danh mục <strong>{deleting.categoryName}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            {deleteError && <p className="inline-error" role="alert">{deleteError}</p>}
          </div>
          <div className="modal-actions">
            <button className="button secondary" disabled={deleteBusy} onClick={() => setDeleting(undefined)}>Hủy</button>
            <button className="button danger" disabled={deleteBusy} onClick={() => void handleDelete()}>
              {deleteBusy ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
