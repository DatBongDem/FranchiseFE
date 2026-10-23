import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, Badge, money } from "./ui";
import { cancelOrder } from "../services/cancelOrderService";
import type { Order } from "../types/product";
import type { User } from "../types/user";
export default function CancelOrderModal({
  order,
  user,
  onClose,
  onDone,
}: {
  order: Order;
  user: User;
  onClose: () => void;
  onDone: (order: Order) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      onDone(await cancelOrder(user, order, reason));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Xác nhận hủy đơn hàng"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="cancel-order-content">
        <div className="cancel-order-warning">
          <AlertTriangle size={24} />
          <p>
            Đơn sẽ chuyển sang <strong>Đã hủy</strong>. Không thể hoàn tác thao
            tác này trên giao diện.
          </p>
        </div>
        <dl className="detail-list">
          <dt>Mã đơn</dt>
          <dd>{order.orderId}</dd>
          <dt>Trạng thái hiện tại</dt>
          <dd>
            <Badge status={order.status} />
          </dd>
          <dt>Giá trị đơn</dt>
          <dd>{money(order.totalAmount)}</dd>
        </dl>
        {order.status === "Creating" && (
          <p>Đây là đơn nháp. API hủy đơn không tạo đơn nháp thay thế.</p>
        )}
        <label className="cancel-order-reason">
          Lý do hủy (không bắt buộc)
          <textarea
            rows={4}
            value={reason}
            disabled={busy || !!error}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: đặt nhầm sản phẩm, thay đổi nhu cầu…"
          />
        </label>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            {error ? "Đóng và tải lại" : "Giữ đơn"}
          </button>
          <button
            className="button cancel-order-button"
            disabled={busy || !!error}
            onClick={() => void submit()}
          >
            {busy ? "Đang hủy…" : "Xác nhận hủy đơn"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
