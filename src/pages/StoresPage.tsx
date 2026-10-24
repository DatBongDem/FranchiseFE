import { useState } from "react";
import { RefreshCw, Plus, Pencil, Trash2, Store as StoreIcon } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { storeService, type Store } from "../services/storeService";
import {
  Badge,
  Feedback,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import { CreateStoreModal, EditStoreModal, DeleteStoreModal } from "../components/StoreModals";

export default function StoresPage() {
  const resource = useResource(storeService.getAll);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Store>();
  const [deleting, setDeleting] = useState<Store>();
  const [notice, setNotice] = useState("");

  const rows = (resource.data || []).filter((s) =>
    `${s.storeName} ${s.address || ""}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));

  function done(msg: string) {
    setCreating(false);
    setEditing(undefined);
    setDeleting(undefined);
    setNotice(msg);
    void resource.reload();
  }

  return (
    <>
      <PageTitle
        eyebrow="HỆ THỐNG / CỬA HÀNG"
        title="Mạng lưới cửa hàng"
        description="Quản lý danh sách, địa chỉ và trạng thái hoạt động của từng cửa hàng trong hệ thống."
      >
        <button className="button primary" onClick={() => { setNotice(""); setCreating(true); }}>
          <Plus size={16} /> Thêm cửa hàng
        </button>
        <button className="button secondary" onClick={() => void resource.reload()}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </PageTitle>

      <div className="mini-stats">
        <div>
          <span>Tổng cửa hàng</span>
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
            Danh sách cửa hàng{" "}
            <span className="count">{resource.data?.length ?? 0}</span>
          </h2>
          <StoreIcon size={20} color="#28704c" />
        </div>
        <div className="toolbar">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Tìm tên, địa chỉ cửa hàng…"
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
                    <th>TÊN CỬA HÀNG</th>
                    <th>MÃ ID</th>
                    <th>ĐỊA CHỈ</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * size, current * size).map((s) => (
                    <tr key={s.storeId}>
                      <td>
                        <div className="name-cell">
                          <span className="avatar store-avatar">
                            {s.storeName.charAt(0).toUpperCase()}
                          </span>
                          <strong>{s.storeName}</strong>
                        </div>
                      </td>
                      <td>
                        <small className="muted">{s.storeId.slice(0, 8).toUpperCase()}</small>
                      </td>
                      <td>{s.address || <span className="muted">Chưa có địa chỉ</span>}</td>
                      <td>
                        <Badge status={s.status || "Active"} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            title="Sửa cửa hàng"
                            onClick={() => { setNotice(""); setEditing(s); }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-icon"
                            title="Xóa cửa hàng"
                            onClick={() => { setNotice(""); setDeleting(s); }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
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
              onSize={(v) => { setSize(v); setPage(1); }}
            />
          </>
        )}
      </section>

      {creating && (
        <CreateStoreModal
          onClose={() => setCreating(false)}
          onDone={() => done("Đã tạo cửa hàng thành công.")}
        />
      )}
      {editing && (
        <EditStoreModal
          store={editing}
          onClose={() => setEditing(undefined)}
          onDone={() => done(`Đã cập nhật cửa hàng "${editing.storeName}".`)}
        />
      )}
      {deleting && (
        <DeleteStoreModal
          store={deleting}
          onClose={() => setDeleting(undefined)}
          onDone={() => done(`Đã xóa cửa hàng "${deleting.storeName}".`)}
        />
      )}
    </>
  );
}
