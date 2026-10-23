import { useState, type FormEvent } from "react";
import {
  BarChart3,
  CalendarDays,
  Coins,
  Package,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { revenueService } from "../services/revenueService";
import {
  filterRevenue,
  revenueDate,
  revenuePreset,
  validateRevenueRange,
} from "../utils/revenue";
import type { RevenueRange, RevenueSort } from "../types/revenue";
import {
  Feedback,
  money,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import RevenueChart from "../components/RevenueChart";

export default function RevenuePage() {
  const { user } = useAuth();
  const manager = user!;
  const [applied, setApplied] = useState<RevenueRange>(() =>
    revenuePreset("month"),
  );
  const [draft, setDraft] = useState<RevenueRange>(applied);
  const [filterError, setFilterError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<RevenueSort>("revenue-desc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const report = useResource(
    async () => ({
      range: applied,
      report: await revenueService.report(manager, applied),
      loadedAt: new Date(),
    }),
    [manager.role, manager.idStore, applied.from, applied.to],
  );
  const data = report.data?.report;
  const rows = filterRevenue(data?.items || [], search, sort);
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / size)),
  );
  const displayedRange = report.data?.range || applied;
  const margin =
    data && data.summary.totalRevenue !== 0
      ? (data.summary.totalProfit / data.summary.totalRevenue) * 100
      : null;
  const percent = (value: number | null) =>
    value === null
      ? "—"
      : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
  function apply(next: RevenueRange) {
    try {
      validateRevenueRange(next);
      setFilterError("");
      setPage(1);
      setApplied({ ...next });
      if (next.from === applied.from && next.to === applied.to)
        void report.reload();
    } catch (err) {
      setFilterError((err as Error).message);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(draft);
  }
  function preset(value: "today" | "week" | "month") {
    const next = revenuePreset(value);
    setDraft(next);
    apply(next);
  }
  return (
    <>
      <PageTitle
        eyebrow="BÁO CÁO / DOANH THU CỬA HÀNG"
        title="Hiểu con số, hiểu cửa hàng"
        description="Theo dõi doanh thu, giá vốn và lợi nhuận gộp từ hóa đơn bán hàng của cửa hàng bạn quản lý."
      >
        <button
          className="button secondary"
          disabled={report.loading}
          onClick={() => void report.reload()}
        >
          <RefreshCw size={16} /> Làm mới báo cáo
        </button>
      </PageTitle>
      <section className="panel revenue-filter">
        <div className="panel-heading">
          <div>
            <h2>Khoảng thời gian báo cáo</h2>
            <p>Ngày bắt đầu và kết thúc đều được tính vào báo cáo.</p>
          </div>
          <CalendarDays size={22} color="#72945b" />
        </div>
        <form onSubmit={submit}>
          <div className="revenue-range-fields">
            <label>
              Từ ngày
              <input
                type="date"
                value={draft.from}
                max={draft.to || undefined}
                required
                onChange={(e) => {
                  setDraft({ ...draft, from: e.target.value });
                  setFilterError("");
                }}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                required
                onChange={(e) => {
                  setDraft({ ...draft, to: e.target.value });
                  setFilterError("");
                }}
              />
            </label>
            <button
              className="button primary"
              type="submit"
              disabled={report.loading}
            >
              <BarChart3 size={17} /> Xem báo cáo
            </button>
          </div>
          <div className="revenue-presets">
            <span>Chọn nhanh</span>
            <button
              type="button"
              disabled={report.loading}
              onClick={() => preset("today")}
            >
              Hôm nay
            </button>
            <button
              type="button"
              disabled={report.loading}
              onClick={() => preset("week")}
            >
              7 ngày gần đây
            </button>
            <button
              type="button"
              disabled={report.loading}
              onClick={() => preset("month")}
            >
              Tháng này
            </button>
          </div>
        </form>
        {filterError && (
          <p className="inline-error" role="alert">
            {filterError}
          </p>
        )}
      </section>
      <Feedback
        loading={report.loading}
        error={report.error}
        retry={report.reload}
      />
      {!report.loading && !report.error && data && (
        <>
          <div className="revenue-period">
            <span>
              <CalendarDays size={16} />
              <strong>
                {revenueDate(displayedRange.from)} —{" "}
                {revenueDate(displayedRange.to)}
              </strong>
            </span>
            <span title={manager.idStore}>
              Cửa hàng #{manager.idStore?.slice(0, 8).toUpperCase()}
            </span>
            <span>
              Cập nhật{" "}
              {report.data!.loadedAt.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </span>
          </div>
          <div className="stats-grid revenue-stats">
            <article className="stat-card">
              <div>
                <span>Tổng doanh thu</span>
                <span className="stat-icon orange">
                  <Coins size={20} />
                </span>
              </div>
              <strong>{money(data.summary.totalRevenue)}</strong>
              <small>Doanh thu theo hóa đơn trong kỳ</small>
            </article>
            <article className="stat-card">
              <div>
                <span>Tổng giá vốn</span>
                <span className="stat-icon yellow">
                  <Wallet size={20} />
                </span>
              </div>
              <strong>{money(data.summary.totalCost)}</strong>
              <small>Giá vốn do hệ thống tính</small>
            </article>
            <article className="stat-card">
              <div>
                <span>Lợi nhuận gộp</span>
                <span className="stat-icon green">
                  <TrendingUp size={20} />
                </span>
              </div>
              <strong
                className={
                  data.summary.totalProfit < 0
                    ? "revenue-negative"
                    : "revenue-positive"
                }
              >
                {money(data.summary.totalProfit)}
              </strong>
              <small>Biên lợi nhuận gộp: {percent(margin)}</small>
            </article>
            <article className="stat-card">
              <div>
                <span>Sản phẩm có phát sinh</span>
                <span className="stat-icon pink">
                  <Package size={20} />
                </span>
              </div>
              <strong>{data.items.length.toLocaleString("vi-VN")}</strong>
              <small>Trong toàn bộ khoảng ngày đã chọn</small>
            </article>
          </div>
          {!data.items.length ? (
            <section className="panel">
              <div className="revenue-no-sales">
                <BarChart3 size={38} />
                <h2>Chưa phát sinh doanh số trong kỳ</h2>
                <p>
                  Thử chọn khoảng thời gian khác để xem hoạt động bán hàng của
                  cửa hàng.
                </p>
              </div>
            </section>
          ) : (
            <>
              <RevenueChart
                items={data.items}
                onSelect={(name) => {
                  setSearch(name);
                  setPage(1);
                }}
              />
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Doanh thu theo sản phẩm</h2>
                    <p>
                      Tìm kiếm và phân trang chỉ áp dụng cho bảng; tổng quan và
                      biểu đồ giữ toàn kỳ.
                    </p>
                  </div>
                  <span className="count">{rows.length} sản phẩm</span>
                </div>
                <div className="toolbar wrap">
                  <SearchInput
                    value={search}
                    onChange={(value) => {
                      setSearch(value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo tên sản phẩm (có hoặc không dấu)…"
                  />
                  <select
                    aria-label="Sắp xếp báo cáo"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as RevenueSort);
                      setPage(1);
                    }}
                  >
                    <option value="revenue-desc">Doanh thu giảm dần</option>
                    <option value="revenue-asc">Doanh thu tăng dần</option>
                    <option value="profit-desc">Lợi nhuận giảm dần</option>
                    <option value="profit-asc">Lợi nhuận tăng dần</option>
                    <option value="quantity-desc">Số lượng giảm dần</option>
                    <option value="name">Tên sản phẩm A → Z</option>
                  </select>
                </div>
                <Feedback empty={!rows.length} />
                {rows.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>SẢN PHẨM</th>
                          <th>SỐ LƯỢNG BÁN</th>
                          <th>DOANH THU</th>
                          <th>GIÁ VỐN</th>
                          <th>LỢI NHUẬN GỘP</th>
                          <th>BIÊN LỢI NHUẬN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows
                          .slice((currentPage - 1) * size, currentPage * size)
                          .map((item) => (
                            <tr key={item.productId}>
                              <td>
                                <strong>{item.productName}</strong>
                                <small title={item.productId}>
                                  #{item.productId.slice(0, 8).toUpperCase()}
                                </small>
                              </td>
                              <td>
                                {item.totalQuantitySold.toLocaleString("vi-VN")}
                              </td>
                              <td className="amount">
                                {money(item.totalRevenue)}
                              </td>
                              <td>{money(item.totalCost)}</td>
                              <td
                                className={
                                  item.profit < 0
                                    ? "revenue-negative"
                                    : "revenue-positive"
                                }
                              >
                                {money(item.profit)}
                              </td>
                              <td>
                                {percent(
                                  item.totalRevenue !== 0
                                    ? (item.profit / item.totalRevenue) * 100
                                    : null,
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination
                  page={currentPage}
                  total={rows.length}
                  size={size}
                  onPage={setPage}
                  onSize={(value) => {
                    setSize(value);
                    setPage(1);
                  }}
                />
              </section>
            </>
          )}
          <div className="revenue-method">
            <TrendingUp size={19} />
            <p>
              <strong>Cách đọc báo cáo:</strong> Lợi nhuận gộp = doanh thu − giá
              vốn, chưa trừ chi phí vận hành. Backend tính giá vốn theo giá vốn
              sản phẩm hiện tại; số liệu lịch sử có thể thay đổi khi giá vốn
              được cập nhật.
            </p>
          </div>
        </>
      )}
    </>
  );
}
