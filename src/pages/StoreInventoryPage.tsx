import { useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  filterInventory,
  storeInventoryService,
  type InventorySort,
} from "../services/storeInventoryService";
import { Feedback, PageTitle, Pagination, SearchInput } from "../components/ui";
export default function StoreInventoryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [unit, setUnit] = useState("");
  const [sort, setSort] = useState<InventorySort>("name");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const resource = useResource(
    async () => ({
      items: await storeInventoryService.list(user!),
      loadedAt: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    }),
    [user!.role, user!.idStore],
  );
  const items = resource.data?.items || [];
  const rows = filterInventory(items, search, status, unit, sort);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const units = [...new Set(items.map((i) => i.unit))].sort();
  return (
    <>
      <PageTitle
        eyebrow="CỬA HÀNG / TỒN KHO"
        title="Tồn kho cửa hàng"
        description="Theo dõi số lượng sản phẩm còn lại từ các đơn đã hoàn thành."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Cập nhật tồn kho
        </button>
      </PageTitle>
      <div className="recipe-banner">
        <Package size={32} />
        <div>
          <strong>Kiểm tra hàng sẵn có tại cửa hàng</strong>
          <p>
            Cửa hàng #{user!.idStore?.slice(0, 8).toUpperCase() || "—"} · Chỉ
            tính lô chưa hết hạn hoặc không có hạn dùng.
          </p>
        </div>
      </div>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && resource.data && (
        <>
          <p className="muted">
            Tải dữ liệu lúc {resource.data.loadedAt} (giờ Việt Nam). Số lượng có
            thể thay đổi sau giao dịch bán hàng.
          </p>
          <div className="mini-stats">
            <div>
              <span>Sản phẩm API trả về</span>
              <b>{items.length}</b>
            </div>
            <div>
              <span>Còn hàng</span>
              <b>{items.filter((i) => i.totalQuantity > 0).length}</b>
            </div>
            <div>
              <span>Không còn lượng khả dụng</span>
              <b>{items.filter((i) => i.totalQuantity <= 0).length}</b>
            </div>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Chi tiết tồn kho</h2>
              <span>{rows.length} sản phẩm phù hợp</span>
            </div>
            <div className="toolbar wrap">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Tìm tên hoặc mã sản phẩm…"
              />
              <select
                aria-label="Tình trạng tồn kho"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả tình trạng</option>
                <option value="available">Còn hàng</option>
                <option value="empty">Không còn lượng khả dụng</option>
              </select>
              <select
                aria-label="Đơn vị"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả đơn vị</option>
                {units.filter(Boolean).map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <select
                aria-label="Sắp xếp tồn kho"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as InventorySort);
                  setPage(1);
                }}
              >
                <option value="name">Tên A → Z</option>
                <option value="quantity-asc">Số lượng tăng dần</option>
                <option value="quantity-desc">Số lượng giảm dần</option>
              </select>
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setUnit("");
                  setStatus("");
                  setSort("name");
                  setPage(1);
                }}
              >
                Bỏ lọc
              </button>
            </div>
            {!rows.length ? (
              <div className="feedback">
                <Package />
                <b>
                  {!items.length
                    ? "Chưa có dữ liệu tồn kho khả dụng"
                    : "Không có sản phẩm phù hợp"}
                </b>
                <span>
                  {!items.length
                    ? "Chưa có lô phù hợp từ đơn hoàn thành tại cửa hàng."
                    : "Thử thay đổi tên, đơn vị hoặc tình trạng."}
                </span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>SỐ LƯỢNG CÒN LẠI</th>
                      <th>ĐƠN VỊ</th>
                      <th>TÌNH TRẠNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .slice((current - 1) * size, current * size)
                      .map((i) => (
                        <tr key={i.productId}>
                          <td>
                            <strong>{i.productName}</strong>
                            <small>{i.productId}</small>
                          </td>
                          <td>
                            {i.totalQuantity.toLocaleString("vi-VN", {
                              maximumFractionDigits: 20,
                            })}
                          </td>
                          <td>{i.unit || "—"}</td>
                          <td>
                            <span
                              className={`badge ${i.totalQuantity > 0 ? "green" : "orange"}`}
                            >
                              <i />
                              {i.totalQuantity > 0
                                ? "Còn hàng"
                                : "Không còn lượng khả dụng"}
                            </span>
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
          </section>
          <p className="muted">
            Danh sách chỉ gồm sản phẩm có lô phù hợp theo API, không phải toàn
            bộ danh mục. Không cộng số lượng giữa các đơn vị; đây không phải báo
            cáo giá trị tồn kho.
          </p>
        </>
      )}
    </>
  );
}
