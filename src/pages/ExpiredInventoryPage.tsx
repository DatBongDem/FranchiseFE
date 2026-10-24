import { useState, type FormEvent } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  expiredInventoryService,
  validateExpiryDate,
} from "../services/expiredInventoryService";
import {
  filterInventory,
  type InventorySort,
} from "../services/storeInventoryService";
import { vietnamToday, revenueDate } from "../utils/revenue";
import { Feedback, PageTitle, Pagination, SearchInput } from "../components/ui";
export default function ExpiredInventoryPage() {
  const { user } = useAuth();
  const [day, setDay] = useState(() => vietnamToday());
  const [draft, setDraft] = useState(day);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [sort, setSort] = useState<InventorySort>("name");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const resource = useResource(
    async () => ({
      day,
      items: await expiredInventoryService.byDate(user!.role, day),
      loadedAt: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    }),
    [user!.role, day],
  );
  const items = resource.data?.items || [];
  const rows = filterInventory(items, search, "", unit, sort);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const units = [...new Set(items.map((i) => i.unit))].filter(Boolean).sort();
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      validateExpiryDate(draft);
      setError("");
      setPage(1);
      setSearch("");
      setUnit("");
      if (day === draft) void resource.reload();
      else setDay(draft);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="KHO / BÁO CÁO HẾT HẠN"
        title="Hàng hết hạn theo ngày"
        description="Tra cứu sản phẩm còn số lượng trong các lô đến hạn vào ngày được chọn, trên toàn hệ thống."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Tải lại
        </button>
      </PageTitle>
      <div className="recipe-banner">
        <CalendarDays size={32} />
        <div>
          <strong>Theo dõi hạn dùng của hàng còn lại</strong>
          <p>
            Chỉ tính lô thuộc đơn đã hoàn thành. Số lượng là lượng còn lại hiện
            tại, không phải số tồn lịch sử hoặc số lượng đã tiêu hủy.
          </p>
        </div>
      </div>
      <section className="panel store-bill-filters">
        <form onSubmit={submit}>
          <label>
            Ngày hết hạn
            <input
              type="date"
              required
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <button className="button primary">Xem báo cáo</button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const today = vietnamToday();
              setDraft(today);
              setDay(today);
              setSearch("");
              setUnit("");
              setPage(1);
              setError("");
              if (today === day) void resource.reload();
            }}
          >
            Hôm nay
          </button>
        </form>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && resource.data && (
        <>
          <p>
            <strong>Ngày hết hạn: {revenueDate(resource.data.day)}</strong> ·
            Tải lúc {resource.data.loadedAt} (giờ Việt Nam).
          </p>
          {day >= vietnamToday() && (
            <div className="notice">
              Ngày được chọn là hôm nay hoặc tương lai. Các lô trong báo cáo có
              thể chưa hết hạn tại thời điểm xem.
            </div>
          )}
          <div className="mini-stats">
            <div>
              <span>Sản phẩm trong báo cáo</span>
              <b>{items.length}</b>
            </div>
            <div>
              <span>Khớp bộ lọc</span>
              <b>{rows.length}</b>
            </div>
            <div>
              <span>Đơn vị có dữ liệu</span>
              <b>{units.length}</b>
            </div>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Chi tiết theo sản phẩm</h2>
              <span>Toàn hệ thống</span>
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
                aria-label="Đơn vị"
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tất cả đơn vị</option>
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <select
                aria-label="Sắp xếp báo cáo"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as InventorySort);
                  setPage(1);
                }}
              >
                <option value="name">Tên A → Z</option>
                <option value="quantity-desc">Số lượng giảm dần</option>
                <option value="quantity-asc">Số lượng tăng dần</option>
              </select>
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setUnit("");
                  setSort("name");
                  setPage(1);
                }}
              >
                Bỏ lọc
              </button>
            </div>
            {!rows.length ? (
              <div className="feedback">
                <CalendarDays />
                <b>
                  {items.length
                    ? "Không có sản phẩm phù hợp bộ lọc"
                    : "Không có hàng còn lại có ngày hết hạn này"}
                </b>
                <span>Thử đổi ngày hoặc bộ lọc.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>SỐ LƯỢNG CÒN LẠI</th>
                      <th>ĐƠN VỊ</th>
                      <th>NGÀY HẾT HẠN</th>
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
                          <td>{revenueDate(day)}</td>
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
            Lọc theo ngày hết hạn được lưu trong hệ thống. Không cộng lẫn các
            đơn vị hoặc tính thiệt hại vì API không cung cấp giá.
          </p>
        </>
      )}
    </>
  );
}
