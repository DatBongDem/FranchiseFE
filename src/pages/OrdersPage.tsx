import { useState } from "react";
import { RefreshCw, ArrowUpRight, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { operationsService } from "../services/operationsService";
import {
  Badge,
  date,
  Feedback,
  Modal,
  money,
  PageTitle,
  Pagination,
  SearchInput,
  statusLabels,
} from "../components/ui";
import type { Order } from "../types/product";
import CancelOrderModal from "../components/CancelOrderModal";
import { canCancelOrder } from "../services/cancelOrderService";
export function actionFor(role: string, status: string) {
  if (role === "KITCHENSTAFF") {
    if (status === "WaitingForCooking")
      return { key: "start-cooking", label: "Bắt đầu nấu" };
    if (status === "Cooking")
      return { key: "finish-cooking", label: "Hoàn tất nấu" };
  }
  if (role === "SUPPLYCOORDINATOR") {
    const actions: Record<string, { key: string; label: string }> = {
      Pending: { key: "pickup", label: "Nhận điều phối" },
      PickedUp: { key: "send-to-kitchen", label: "Chuyển tới bếp" },
      Cooked: { key: "take-from-kitchen", label: "Nhận từ bếp" },
      TakenFrom: { key: "arrive-at-store", label: "Đã đến cửa hàng" },
    };
    return actions[status];
  }
  return undefined;
}
export default function OrdersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const role = user!.role;
  const resource = useResource(
    () => operationsService.orders(role, user?.idStore),
    [role, user?.idStore],
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [selected, setSelected] = useState<Order>();
  const [canceling, setCanceling] = useState<Order>();
  const [pending, setPending] = useState<Order>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() =>
    location.state?.createdOrderId
      ? `Đã gửi đơn #${String(location.state.createdOrderId).slice(0, 8).toUpperCase()} thành công.`
      : "",
  );
  const rows = (resource.data || [])
    .filter(
      (o) =>
        !(user?.idStore && ["STORESTAFF", "MANAGER"].includes(role)) ||
        o.storeId?.toLowerCase() === user.idStore.toLowerCase(),
    )
    .filter(
      (o) =>
        `${o.orderId} ${o.note || ""} ${o.productBatches?.map((b) => b.productName).join(" ") || ""}`
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")) &&
        (!status || o.status === status) &&
        (!from ||
          (!!o.sentTime &&
            new Date(o.sentTime).getTime() >=
              new Date(`${from}T00:00:00`).getTime())) &&
        (!to ||
          (!!o.sentTime &&
            new Date(o.sentTime).getTime() <=
              new Date(`${to}T23:59:59.999`).getTime())),
    );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const kitchen = role === "KITCHENSTAFF";
  const supply = role === "SUPPLYCOORDINATOR";
  async function confirm() {
    if (!pending) return;
    const action = actionFor(role, pending.status);
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      await operationsService.orderAction(pending.orderId, action.key, supply);
      setPending(undefined);
      setNotice("Đã cập nhật trạng thái đơn hàng.");
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
        eyebrow={
          kitchen
            ? "VẬN HÀNH / BẾP TRUNG TÂM"
            : supply
              ? "VẬN HÀNH / ĐIỀU PHỐI"
              : "VẬN HÀNH / ĐƠN HÀNG"
        }
        title={
          kitchen
            ? "Căn bếp luôn sẵn sàng"
            : supply
              ? "Kết nối mọi hành trình"
              : "Theo dõi từng đơn hàng"
        }
        description={
          kitchen
            ? "Tiếp nhận, bắt đầu nấu và hoàn tất đơn hàng từ các cửa hàng."
            : supply
              ? "Theo dõi luồng vận chuyển từ cửa hàng đến bếp và trở lại."
              : "Tra cứu đơn hàng, trạng thái xử lý và thời gian gửi đơn."
        }
      >
        {role === "STORESTAFF" && (
          <Link className="button primary" to="/orders/new">
            <Plus size={16} /> Tạo / tiếp tục đơn
          </Link>
        )}
        <button
          className="button secondary"
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </PageTitle>
      <div className="mini-stats">
        <div>
          <span>Đơn đang hiển thị</span>
          <b>{rows.length}</b>
        </div>
        <div>
          <span>{kitchen ? "Đang nấu" : "Chờ xử lý"}</span>
          <b>
            {
              rows.filter((o) => o.status === (kitchen ? "Cooking" : "Pending"))
                .length
            }
          </b>
        </div>
        <div>
          <span>{kitchen ? "Đã nấu xong" : "Hoàn thành"}</span>
          <b>
            {
              rows.filter(
                (o) => o.status === (kitchen ? "Cooked" : "Completed"),
              ).length
            }
          </b>
        </div>
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            {kitchen
              ? "Hàng đợi chế biến"
              : supply
                ? "Danh sách điều phối"
                : "Danh sách đơn hàng"}
          </h2>
          <span className="muted">Cập nhật từ hệ thống</span>
        </div>
        <div className="toolbar wrap">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm mã đơn, tên món, ghi chú…"
          />
          <select
            aria-label="Trạng thái đơn"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels)
              .filter(([key]) => !["Active", "Blocked"].includes(key))
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
          <label className="date-filter">
            Từ ngày
            <input
              aria-label="Từ ngày"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="date-filter">
            Đến ngày
            <input
              aria-label="Đến ngày"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
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
                    <th>MÃ ĐƠN / CỬA HÀNG</th>
                    <th>THỜI GIAN GỬI</th>
                    <th>TRẠNG THÁI</th>
                    <th>TỔNG GIÁ TRỊ</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((current - 1) * size, current * size).map((o) => {
                    const action = actionFor(role, o.status);
                    return (
                      <tr key={o.orderId}>
                        <td>
                          <strong>
                            #{o.orderId.slice(0, 8).toUpperCase()}
                          </strong>
                          <small>
                            Cửa hàng {o.storeId?.slice(0, 8) || "—"}
                          </small>
                        </td>
                        <td>{date(o.sentTime)}</td>
                        <td>
                          <Badge status={o.status} />
                        </td>
                        <td className="amount">{money(o.totalAmount)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="text-button"
                              onClick={() => setSelected(o)}
                            >
                              Chi tiết <ArrowUpRight size={14} />
                            </button>
                            {action && (
                              <button
                                className="button small primary"
                                onClick={() => {
                                  setPending(o);
                                  setError("");
                                }}
                              >
                                {action.label}
                              </button>
                            )}
                            {canCancelOrder(user!, o) && (
                              <button
                                className="button small cancel-order-button"
                                onClick={() => {
                                  setNotice("");
                                  setCanceling(o);
                                }}
                              >
                                Hủy đơn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          title={`Đơn #${selected.orderId.slice(0, 8).toUpperCase()}`}
          onClose={() => setSelected(undefined)}
        >
          <dl className="detail-list">
            <dt>Mã đầy đủ</dt>
            <dd>{selected.orderId}</dd>
            <dt>Cửa hàng</dt>
            <dd>{selected.storeId}</dd>
            <dt>Trạng thái</dt>
            <dd>
              <Badge status={selected.status} />
            </dd>
            <dt>Ngày gửi</dt>
            <dd>{date(selected.sentTime)}</dd>
            <dt>Tổng giá trị</dt>
            <dd>{money(selected.totalAmount)}</dd>
            <dt>Ghi chú</dt>
            <dd>{selected.note || "Không có ghi chú"}</dd>
          </dl>
          {selected.productBatches?.length ? (
            <div className="batch-list">
              <h3>Sản phẩm trong đơn</h3>
              {selected.productBatches.map((b, i) => (
                <div key={i}>
                  <span>{b.productName}</span>
                  <strong>
                    {b.qualityOrder} {b.unit}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              Danh sách này chỉ cung cấp thông tin tổng quan của đơn hàng.
            </p>
          )}
        </Modal>
      )}
      {canceling && (
        <CancelOrderModal
          order={canceling}
          user={user!}
          onClose={() => {
            setCanceling(undefined);
            void resource.reload();
          }}
          onDone={(order) => {
            setCanceling(undefined);
            setNotice(
              `Đã hủy đơn #${order.orderId.slice(0, 8).toUpperCase()}.`,
            );
            void resource.reload();
          }}
        />
      )}
      {pending && (
        <Modal
          title="Xác nhận cập nhật đơn"
          onClose={() => {
            if (!busy) setPending(undefined);
          }}
        >
          <p>
            Bạn muốn{" "}
            <strong>
              {actionFor(role, pending.status)?.label.toLowerCase()}
            </strong>{" "}
            cho đơn #{pending.orderId.slice(0, 8).toUpperCase()}?
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
              onClick={() => setPending(undefined)}
            >
              Quay lại
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
