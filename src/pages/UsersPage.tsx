import { useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { operationsService } from "../services/operationsService";
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
export default function UsersPage() {
  const resource = useResource(operationsService.users);
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(12);
  const [selected, setSelected] = useState<User>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = (resource.data || []).filter(
    (u) =>
      `${u.name} ${u.gmail}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!role || u.role === role),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  async function toggle() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await operationsService.toggleUser(selected.id);
      setSelected(undefined);
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
        eyebrow="HỆ THỐNG / ĐỘI NGŨ"
        title="Cùng nhau làm tốt hơn"
        description="Tra cứu tài khoản, vai trò và tình trạng hoạt động của đội ngũ."
      >
        <button
          className="button secondary"
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </PageTitle>
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
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm theo tên hoặc email…"
          />
          <select
            aria-label="Lọc vai trò"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
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
                    {user?.role === "ADMIN" && <th>THAO TÁC</th>}
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
                      {user?.role === "ADMIN" && (
                        <td>
                          <button
                            className="text-button"
                            disabled={u.id === user.id}
                            title={
                              u.id === user.id
                                ? "Không đổi trạng thái tài khoản đang sử dụng"
                                : undefined
                            }
                            onClick={() => {
                              setSelected(u);
                              setError("");
                            }}
                          >
                            {u.status === "Blocked"
                              ? "Mở khóa"
                              : "Khóa tài khoản"}
                          </button>
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
              onSize={(v) => {
                setSize(v);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
      {selected && (
        <Modal
          title={
            selected.status === "Blocked"
              ? "Mở khóa tài khoản"
              : "Khóa tài khoản"
          }
          onClose={() => {
            if (!busy) setSelected(undefined);
          }}
        >
          <p>
            Xác nhận thay đổi trạng thái tài khoản{" "}
            <strong>{selected.name}</strong> ({selected.gmail})?
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setSelected(undefined)}
            >
              Hủy
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void toggle()}
            >
              {busy ? "Đang lưu…" : "Xác nhận"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
