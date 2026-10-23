import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useResource } from "../hooks/useResource";
import {
  filterIngredientHistory,
  ingredientHistoryService,
} from "../services/ingredientHistoryService";
import { Feedback, Modal, Pagination, SearchInput } from "./ui";
import type { Order } from "../types/product";
import type { Role } from "../types/user";
export default function OrderIngredientsModal({
  order,
  role,
  onClose,
}: {
  order: Order;
  role: Role;
  onClose: () => void;
}) {
  const resource = useResource(
    () => ingredientHistoryService.byOrder(role, order.orderId),
    [role, order.orderId],
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const rows = filterIngredientHistory(resource.data || [], search, "");
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  return (
    <Modal title="Nguyên liệu theo đơn nấu" onClose={onClose}>
      <div className="recipe-editor">
        <p style={{ overflowWrap: "anywhere" }}>
          Đơn <strong>#{order.orderId}</strong>
        </p>
        <p>
          Đây là lượng nguyên liệu đã ghi nhận khi chế biến, không phải dự toán
          nguyên liệu cần chuẩn bị.
        </p>
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Tải lại nguyên liệu
        </button>
        <Feedback
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
        {!resource.loading && !resource.error && resource.data && (
          <>
            {!resource.data.length ? (
              <div className="feedback">
                <b>Chưa ghi nhận nguyên liệu cho đơn này</b>
                <span>
                  Đơn chưa bắt đầu nấu hoặc chưa có lịch sử sử dụng nguyên liệu.
                </span>
              </div>
            ) : (
              <>
                <div className="toolbar">
                  <SearchInput
                    value={search}
                    onChange={(s) => {
                      setSearch(s);
                      setPage(1);
                    }}
                    placeholder="Tìm tên nguyên liệu trong đơn…"
                  />
                </div>
                {!rows.length ? (
                  <Feedback empty />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>NGUYÊN LIỆU</th>
                          <th>LƯỢNG ĐÃ DÙNG</th>
                          <th>ĐƠN VỊ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows
                          .slice((current - 1) * size, current * size)
                          .map((i, index) => (
                            <tr key={index}>
                              <td>
                                <strong>
                                  {i.ingredientName === "N/A"
                                    ? "Nguyên liệu không còn trong danh mục"
                                    : i.ingredientName}
                                </strong>
                                <small>{i.ingredientId}</small>
                              </td>
                              <td>
                                {i.quantityUsed.toLocaleString("vi-VN", {
                                  maximumFractionDigits: 20,
                                })}
                              </td>
                              <td>{i.unit || "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                <p className="muted">
                  Giữ riêng các dòng theo lịch sử API. Không cộng lẫn nguyên
                  liệu hoặc đơn vị khác nhau.
                </p>
              </>
            )}
          </>
        )}
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
