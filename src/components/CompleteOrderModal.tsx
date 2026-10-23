import { useRef, useState } from "react";
import { Badge, Feedback, Modal, money } from "./ui";
import { useResource } from "../hooks/useResource";
import { orderService } from "../services/orderService";
import {
  canCompleteOrder,
  completeOrder,
} from "../services/completeOrderService";
import type { Order } from "../types/product";
import type { User } from "../types/user";
export default function CompleteOrderModal({
  order,
  user,
  onClose,
  onDone,
}: {
  order: Order;
  user: User;
  onClose: () => void;
  onDone: () => void;
}) {
  const resource = useResource(
    () => orderService.details(order.orderId, user.idStore!),
    [order.orderId, user.idStore],
  );
  const [feedback, setFeedback] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function submit() {
    if (
      lock.current ||
      !checked ||
      !resource.data ||
      !canCompleteOrder(user, resource.data)
    )
      return;
    lock.current = true;
    setBusy(true);
    try {
      await completeOrder(user, order, feedback);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Xác nhận nhận hàng"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="receive-order">
        <p>
          Đơn <strong>#{order.orderId.slice(0, 8).toUpperCase()}</strong> · Cửa
          hàng #{order.storeId.slice(0, 8).toUpperCase()}
        </p>
        <Feedback
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
        {!resource.loading && !resource.error && resource.data && (
          <>
            <div className="receive-summary">
              <Badge status={resource.data.status} />
              <strong>{money(resource.data.totalAmount)}</strong>
            </div>
            <p>
              Kiểm tra hàng thực nhận trước khi xác nhận. Đơn sẽ chuyển sang
              Hoàn thành và không thể hủy trên giao diện.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>SỐ LƯỢNG ĐẶT</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.productBatches.map((b, i) => (
                    <tr key={i}>
                      <td>{b.productName}</td>
                      <td>
                        {b.qualityOrder} {b.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!resource.data.productBatches.length && (
              <p>
                API chưa trả về chi tiết sản phẩm. Hãy kiểm tra chứng từ giao
                hàng.
              </p>
            )}
            {!canCompleteOrder(user, resource.data) ? (
              <p role="alert" className="inline-error">
                Đơn không còn ở trạng thái đã đến cửa hàng. Hãy đóng và tải lại.
              </p>
            ) : (
              <>
                <label className="receive-feedback">
                  Phản hồi khi nhận hàng (không bắt buộc)
                  <textarea
                    rows={3}
                    value={feedback}
                    disabled={busy || !!error}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ghi nhận chất lượng, tình trạng hàng giao…"
                  />
                </label>
                <label className="receive-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy || !!error}
                    onChange={(e) => setChecked(e.target.checked)}
                  />{" "}
                  Tôi đã kiểm tra và xác nhận nhận hàng cho đơn này.
                </label>
              </>
            )}
          </>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            {error ? "Đóng và tải lại" : "Quay lại"}
          </button>
          <button
            className="button primary"
            disabled={
              busy ||
              !!error ||
              !checked ||
              resource.loading ||
              !!resource.error ||
              !resource.data ||
              !canCompleteOrder(user, resource.data)
            }
            onClick={() => void submit()}
          >
            {busy ? "Đang xác nhận…" : "Xác nhận đã nhận hàng"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
