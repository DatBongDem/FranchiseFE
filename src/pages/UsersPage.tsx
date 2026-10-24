import { useState } from "react";
import { RefreshCw, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { operationsService } from "../services/operationsService";
import { storeService } from "../services/storeService";
import { useAuth } from "../contexts/AuthContext";
import { roleLabels, type Role, type User } from "../types/user";
import {
  Badge,
  Feedback,
  Modal,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import { CreateUserModal, EditUserModal, DeleteUserModal } from "../components/UserModals";

export default function UsersPage() {
  const resource = useResource(operationsService.users);
  const stores = useResource(storeService.getAll);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [notice, setNotice] = useState("");

  // Toggle status
  const [toggling, setToggling] = useState<User>();
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState("");

  // CRUD modals
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User>();
  const [deleting, setDeleting] = useState<User>();

  const rows = (resource.data || []).filter(
    (u) =>
      `${u.name} ${u.gmail}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!role || u.role === role),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));

  async function toggle() {
    if (!toggling) return;
    setToggleBusy(true);
    setToggleError("");
    try {
      await operationsService.toggleUser(toggling.id);
      setToggling(undefined);
      setNotice(
        toggling.status === "Blocked"
          ? `Đã mở khóa tài khoản ${toggling.name}.`
          : `Đã khóa tài khoản ${toggling.name}.`
      );
      await resource.reload();
    } catch (err) {
      setToggleError((err as Error).message);
    } finally {
      setToggleBusy(false);
    }
  }

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
        eyebrow="HỆ THỐNG / ĐỘI NGŨ"
        title="Cùng nhau làm tốt hơn"
        description="Tra cứu tài khoản, vai trò và tình trạng hoạt động của đội ngũ."
      >
        {isAdmin && (
          <button
            className="button primary"
            onClick={() => { setNotice(""); setCreating(true); }}
          >
            <Plus size={16} /> Tạo tài khoản
          </button>
        )}
        <button className="button secondary" onClick={() => void resource.reload()}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </PageTitle>

      {notice && <div className="notice" role="status">{notice}</div>}

      <section className="panel">
        <div className="panel-heading">
          <h2>
            Thành viên hệ thống{" "}
            <span className="count">{resource.data?.length ?? 0}</span>
          </h2>
          <ShieldCheck size={20} color="#28704c" />
        </div>
        <div className="toolbar">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Tìm theo tên hoặc email…"
          />
          <select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
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
                    <th>THÀNH VIÊN</th>
                    <th>VAI TRÒ</th>
                    <th>TRẠNG THÁI</th>
                    <th>ĐIỆN THOẠI</th>
                    {isAdmin && <th>THAO TÁC</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * size, current * size).map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="name-cell">
                          <span className="avatar">
                            {u.name?.charAt(0) || "F"}
                          </span>
                          <div>
                            <strong>{u.name}</strong>
                            <small>{u.gmail}</small>
                          </div>
                        </div>
                      </td>
                      <td>{roleLabels[u.role as Role] || u.role}</td>
                      <td>
                        <Badge status={u.status || "Unknown"} />
                      </td>
                      <td>{u.phoneNumber || "—"}</td>
                      {isAdmin && (
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              title="Sửa tài khoản"
                              onClick={() => { setNotice(""); setEditing(u); }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="text-button"
                              disabled={u.id === user?.id}
                              title={u.id === user?.id ? "Không đổi trạng thái tài khoản đang sử dụng" : undefined}
                              onClick={() => { setNotice(""); setToggling(u); setToggleError(""); }}
                            >
                              {u.status === "Blocked" ? "Mở khóa" : "Khóa"}
                            </button>
                            <button
                              className="icon-button danger-icon"
                              title="Xóa tài khoản"
                              disabled={u.id === user?.id}
                              onClick={() => { setNotice(""); setDeleting(u); }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
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

      {/* Toggle status confirm */}
      {toggling && (
        <Modal
          title={toggling.status === "Blocked" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
          onClose={() => { if (!toggleBusy) setToggling(undefined); }}
        >
          <div className="modal-body">
            <p>
              Xác nhận thay đổi trạng thái tài khoản{" "}
              <strong>{toggling.name}</strong> ({toggling.gmail})?
            </p>
            {toggleError && <p className="inline-error" role="alert">{toggleError}</p>}
          </div>
          <div className="modal-actions">
            <button className="button secondary" disabled={toggleBusy} onClick={() => setToggling(undefined)}>
              Hủy
            </button>
            <button className="button primary" disabled={toggleBusy} onClick={() => void toggle()}>
              {toggleBusy ? "Đang lưu…" : "Xác nhận"}
            </button>
          </div>
        </Modal>
      )}

      {/* Create user */}
      {creating && (
        <CreateUserModal
          stores={stores.data || []}
          onClose={() => setCreating(false)}
          onDone={() => done("Đã tạo tài khoản thành công.")}
        />
      )}

      {/* Edit user */}
      {editing && (
        <EditUserModal
          user={editing}
          stores={stores.data || []}
          onClose={() => setEditing(undefined)}
          onDone={() => done(`Đã cập nhật tài khoản "${editing.name}".`)}
        />
      )}

      {/* Delete user */}
      {deleting && (
        <DeleteUserModal
          user={deleting}
          onClose={() => setDeleting(undefined)}
          onDone={() => done(`Đã xóa tài khoản "${deleting.name}".`)}
        />
      )}
    </>
  );
}
