import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Coins,
  Package,
  RefreshCw,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { shrinkageService } from "../services/shrinkageService";
import {
  filterShrinkage,
  shrinkageTotals,
  topShrinkageProducts,
  validateShrinkageFilter,
} from "../utils/shrinkage";
import { revenueDate } from "../utils/revenue";
import type { ShrinkageFilter, ShrinkageSort } from "../types/shrinkage";
import { Feedback, money, PageTitle, Pagination } from "../components/ui";

const emptyFilter: ShrinkageFilter = { search: "", from: "", to: "" };
export default function ShrinkagePage() {
  const { user } = useAuth();
  const manager = user!;
  const resource = useResource(
    () => shrinkageService.report(manager),
    [manager.role, manager.idStore],
  );
  const [draft, setDraft] = useState<ShrinkageFilter>(emptyFilter);
  const [applied, setApplied] = useState<ShrinkageFilter>(emptyFilter);
  const [filterError, setFilterError] = useState("");
  const [sort, setSort] = useState<ShrinkageSort>("date-asc");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const data = resource.data;
  const rows = filterShrinkage(data?.items || [], applied, sort);
  const totals = shrinkageTotals(rows);
  const top = topShrinkageProducts(rows);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const hasFilter = !!(applied.search || applied.from || applied.to);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      validateShrinkageFilter(draft);
      setApplied({ ...draft });
      setPage(1);
      setFilterError("");
    } catch (err) {
      setFilterError((err as Error).message);
    }
  }
  function reset() {
    setDraft(emptyFilter);
    setApplied(emptyFilter);
    setPage(1);
    setFilterError("");
  }
  return (
    <>
      <PageTitle
        eyebrow="BÁO CÁO / HAO HỤT CỬA HÀNG"
        title="Theo dõi hao hụt, giảm lãng phí"
        description="Kiểm tra số lượng còn lại đã hết hạn và giá trị thiệt hại tại cửa hàng bạn quản lý."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Cập nhật báo cáo
        </button>
      </PageTitle>
      <div className="shrinkage-intro">
        <AlertTriangle size={26} />
        <p>
          <strong>Tồn hết hạn tại thời điểm hiện tại.</strong> Dữ liệu được tổng
          hợp theo sản phẩm và ngày hết hạn; đây không phải lịch sử các lần tiêu
          hủy hàng.
        </p>
      </div>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && data && (
        <>
          <div className="revenue-period">
            <span>
              <CalendarDays size={16} />
              <strong>
                Tính đến{" "}
                {new Date(data.summary.calculatedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </strong>
            </span>
            <span title={data.summary.storeId}>
              Cửa hàng #{data.summary.storeId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="stats-grid revenue-stats">
            <article className="stat-card">
              <div>
                <span>Tổng số lượng hết hạn</span>
                <span className="stat-icon orange">
                  <Package size={20} />
                </span>
              </div>
              <strong>
                {data.summary.totalExpiredQuantity.toLocaleString("vi-VN")}
              </strong>
              <small>Toàn bộ dữ liệu báo cáo</small>
            </article>
            <article className="stat-card">
              <div>
                <span>Tổng thiệt hại</span>
                <span className="stat-icon pink">
                  <Coins size={20} />
                </span>
              </div>
              <strong className="shrinkage-loss">
                {money(data.summary.totalLossAmount)}
              </strong>
              <small>Theo giá vốn từ hệ thống</small>
            </article>
            <article className="stat-card">
              <div>
                <span>Sản phẩm có hao hụt</span>
                <span className="stat-icon yellow">
                  <AlertTriangle size={20} />
                </span>
              </div>
              <strong>{shrinkageTotals(data.items).products}</strong>
              <small>Số sản phẩm khác nhau</small>
            </article>
            <article className="stat-card">
              <div>
                <span>Nhóm hết hạn</span>
                <span className="stat-icon green">
                  <CalendarDays size={20} />
                </span>
              </div>
              <strong>{data.items.length}</strong>
              <small>Mỗi nhóm là sản phẩm + ngày hết hạn</small>
            </article>
          </div>
          {!data.items.length ? (
            <section className="panel shrinkage-empty">
              <ShieldCheck size={42} />
              <h2>Chưa có tồn hết hạn được ghi nhận</h2>
              <p>
                Không có sản phẩm hao hụt theo dữ liệu trả về tại thời điểm
                tính.
              </p>
            </section>
          ) : (
            <>
              <section className="panel shrinkage-filters">
                <div className="panel-heading">
                  <div>
                    <h2>Tra cứu chi tiết hao hụt</h2>
                    <p>
                      Lọc theo ngày hết hạn trên dữ liệu hiện có; không thay đổi
                      các tổng quan phía trên.
                    </p>
                  </div>
                </div>
                <form onSubmit={submit}>
                  <label className="shrinkage-search">
                    Tên sản phẩm
                    <input
                      value={draft.search}
                      onChange={(e) =>
                        setDraft({ ...draft, search: e.target.value })
                      }
                      placeholder="Tìm tên có hoặc không dấu…"
                    />
                  </label>
                  <label>
                    Từ ngày hết hạn
                    <input
                      type="date"
                      value={draft.from}
                      max={draft.to || undefined}
                      onChange={(e) =>
                        setDraft({ ...draft, from: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Đến ngày hết hạn
                    <input
                      type="date"
                      value={draft.to}
                      min={draft.from || undefined}
                      onChange={(e) =>
                        setDraft({ ...draft, to: e.target.value })
                      }
                    />
                  </label>
                  <button className="button primary">Áp dụng</button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={reset}
                  >
                    Bỏ lọc
                  </button>
                </form>
                {filterError && (
                  <p className="inline-error" role="alert">
                    {filterError}
                  </p>
                )}
              </section>
              <div className="shrinkage-filter-summary" aria-live="polite">
                <div>
                  <strong>
                    {hasFilter ? "Kết quả theo bộ lọc" : "Toàn bộ chi tiết"}
                  </strong>
                  <p>
                    {applied.search && <>Tên: “{applied.search}” · </>}
                    {applied.from
                      ? revenueDate(applied.from)
                      : "Không giới hạn từ ngày"}{" "}
                    →{" "}
                    {applied.to
                      ? revenueDate(applied.to)
                      : "Không giới hạn đến ngày"}
                  </p>
                </div>
                <span>
                  <b>{rows.length}</b> nhóm
                </span>
                <span>
                  <b>{totals.quantity.toLocaleString("vi-VN")}</b> số lượng
                </span>
                <span>
                  <b>{money(totals.loss)}</b> thiệt hại
                </span>
              </div>
              {top.length > 0 && (
                <section className="panel revenue-chart">
                  <div className="panel-heading">
                    <div>
                      <h2>Sản phẩm có thiệt hại cao nhất</h2>
                      <p>
                        Top 5 sau bộ lọc · Gộp tất cả ngày hết hạn của cùng sản
                        phẩm
                      </p>
                    </div>
                  </div>
                  <div className="revenue-bars">
                    {top.map((item, index) => (
                      <div
                        className="revenue-bar-row shrinkage-bar"
                        key={item.id}
                      >
                        <span className="revenue-rank">0{index + 1}</span>
                        <span className="revenue-bar-main">
                          <span className="revenue-bar-caption">
                            <strong>{item.name}</strong>
                            <span>{money(item.loss)}</span>
                          </span>
                          <span className="revenue-bar-track">
                            <span
                              style={{
                                width: `${(item.loss / top[0].loss) * 100}%`,
                              }}
                            />
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <section className="panel">
                <div className="panel-heading">
                  <h2>Chi tiết sản phẩm hết hạn</h2>
                  <select
                    aria-label="Sắp xếp hao hụt"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as ShrinkageSort);
                      setPage(1);
                    }}
                  >
                    <option value="date-asc">Hết hạn cũ nhất</option>
                    <option value="date-desc">Hết hạn mới nhất</option>
                    <option value="loss-desc">Thiệt hại giảm dần</option>
                    <option value="quantity-desc">Số lượng giảm dần</option>
                    <option value="name">Tên sản phẩm A → Z</option>
                  </select>
                </div>
                {!rows.length ? (
                  <div className="shrinkage-empty">
                    <SearchX size={36} />
                    <h2>Không có kết quả phù hợp</h2>
                    <p>Thử thay đổi tên hoặc khoảng ngày hết hạn.</p>
                    <button className="button secondary" onClick={reset}>
                      Xem toàn bộ
                    </button>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>SẢN PHẨM</th>
                          <th>NGÀY HẾT HẠN</th>
                          <th>SỐ LƯỢNG HẾT HẠN</th>
                          <th>THIỆT HẠI</th>
                          <th>TÌNH TRẠNG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows
                          .slice((current - 1) * size, current * size)
                          .map((item) => (
                            <tr key={`${item.productId}:${item.expiredDate}`}>
                              <td>
                                <strong>{item.productName}</strong>
                                <small title={item.productId}>
                                  #{item.productId.slice(0, 8).toUpperCase()}
                                </small>
                              </td>
                              <td>{revenueDate(item.expiredDate)}</td>
                              <td>
                                {item.expiredQuantity.toLocaleString("vi-VN")}
                              </td>
                              <td className="amount shrinkage-loss">
                                {money(item.lossAmount)}
                              </td>
                              <td>
                                <span className="badge red">
                                  <i /> Đã hết hạn
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
                  onSize={(value) => {
                    setSize(value);
                    setPage(1);
                  }}
                />
              </section>
            </>
          )}
          <div className="revenue-method">
            <AlertTriangle size={19} />
            <p>
              <strong>Cách tính:</strong> Thiệt hại = số lượng còn lại đã hết
              hạn × giá vốn sản phẩm hiện tại, theo backend. Tổng số lượng không
              quy đổi giữa các đơn vị sản phẩm. Báo cáo này dùng để theo dõi,
              không thực hiện trừ kho hay xác nhận tiêu hủy.
            </p>
          </div>
        </>
      )}
    </>
  );
}
