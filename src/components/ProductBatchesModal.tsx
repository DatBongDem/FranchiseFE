import { useState, type FormEvent } from "react";
import { useResource } from "../hooks/useResource";
import {
  productBatchService,
  filterBatches,
  batchDay,
  validateBatchDates,
} from "../services/productBatchService";
import { Modal, Feedback, Pagination, SearchInput, money, Badge } from "./ui";
import type { Product } from "../types/product";
import type { Role } from "../types/user";
const display = (s: string | null) =>
  s ? batchDay(s).split("-").reverse().join("/") : "Không có";
export default function ProductBatchesModal({
  product,
  role,
  onClose,
}: {
  product: Product;
  role: Role;
  onClose: () => void;
}) {
  const resource = useResource(
    () => productBatchService.list(role, product.productId),
    [role, product.productId],
  );
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("");
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [range, setRange] = useState(draft);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const rows = filterBatches(
    resource.data || [],
    search,
    range.from,
    range.to,
    stock,
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  function apply(e: FormEvent) {
    e.preventDefault();
    try {
      validateBatchDates(draft.from, draft.to);
      setRange({ ...draft });
      setPage(1);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title={`Lô sản phẩm · ${product.productName}`} onClose={onClose}>
      <div className="recipe-editor">
        <p>
          <strong>Phạm vi toàn hệ thống.</strong> Các lô thuộc đơn đã hoàn
          thành, gồm cả lô hết hạn hoặc không còn số lượng. API không cung cấp
          cửa hàng của từng lô.
        </p>
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          Tải lại
        </button>
        <Feedback
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
        {!resource.loading && !resource.error && resource.data && (
          <>
            <div className="toolbar wrap">
              <SearchInput
                value={search}
                onChange={(s) => {
                  setSearch(s);
                  setPage(1);
                }}
                placeholder="Tìm mã lô…"
              />
              <select
                aria-label="Số lượng còn lại"
                value={stock}
                onChange={(e) => {
                  setStock(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả số lượng</option>
                <option value="available">Còn số lượng</option>
                <option value="empty">Không còn số lượng</option>
              </select>
            </div>
            <form className="toolbar wrap" onSubmit={apply}>
              <label>
                Từ ngày hết hạn
                <input
                  type="date"
                  value={draft.from}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                />
              </label>
              <label>
                Đến ngày hết hạn
                <input
                  type="date"
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                />
              </label>
              <button className="button primary">Áp dụng ngày</button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setDraft({ from: "", to: "" });
                  setRange({ from: "", to: "" });
                  setSearch("");
                  setStock("");
                  setPage(1);
                  setError("");
                }}
              >
                Bỏ lọc
              </button>
            </form>
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            <p>
              {rows.length} / {resource.data.length} lô · Hạn dùng{" "}
              {range.from || "không giới hạn"} → {range.to || "không giới hạn"}.
              Lô không có hạn dùng bị loại khi lọc ngày.
            </p>
            {!rows.length ? (
              <Feedback empty />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>MÃ LÔ</th>
                      <th>SL ĐẶT / CÒN LẠI</th>
                      <th>GIÁ</th>
                      <th>SẢN XUẤT</th>
                      <th>HẾT HẠN</th>
                      <th>TRẠNG THÁI LÔ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .slice((current - 1) * size, current * size)
                      .map((i) => (
                        <tr key={i.batchId}>
                          <td title={i.batchId}>
                            <strong>
                              #{i.batchId.slice(0, 8).toUpperCase()}
                            </strong>
                            <small>{i.batchId}</small>
                          </td>
                          <td>
                            {i.qualityOrder.toLocaleString("vi-VN")} /{" "}
                            {i.remainingQuantity.toLocaleString("vi-VN")}{" "}
                            {i.unit}
                          </td>
                          <td>{money(i.price)}</td>
                          <td>{display(i.manufacture)}</td>
                          <td>{display(i.expiry)}</td>
                          <td>
                            <Badge status={i.status} />
                          </td>
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
              Ngày hiển thị theo phần ngày API trả về. Còn số lượng không đồng
              nghĩa với còn hạn sử dụng.
            </p>
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
