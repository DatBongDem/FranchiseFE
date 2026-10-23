import type { ProductRevenue } from "../types/revenue";
import { filterRevenue } from "../utils/revenue";
import { money } from "./ui";
export default function RevenueChart({
  items,
  onSelect,
}: {
  items: ProductRevenue[];
  onSelect: (name: string) => void;
}) {
  const top = filterRevenue(items, "", "revenue-desc")
    .filter((item) => item.totalRevenue > 0)
    .slice(0, 5);
  const max = top[0]?.totalRevenue || 1;
  return (
    <section className="panel revenue-chart">
      <div className="panel-heading">
        <div>
          <h2>Sản phẩm dẫn đầu doanh thu</h2>
          <p>Top 5 trong toàn bộ kỳ báo cáo · Chọn sản phẩm để lọc bảng</p>
        </div>
      </div>
      {top.length ? (
        <div className="revenue-bars">
          {top.map((item, index) => (
            <button
              className="revenue-bar-row"
              key={item.productId}
              onClick={() => onSelect(item.productName)}
              aria-label={`Lọc ${item.productName}, doanh thu ${money(item.totalRevenue)}`}
            >
              <span className="revenue-rank">0{index + 1}</span>
              <span className="revenue-bar-main">
                <span className="revenue-bar-caption">
                  <strong>{item.productName}</strong>
                  <span>{money(item.totalRevenue)}</span>
                </span>
                <span className="revenue-bar-track">
                  <span
                    style={{ width: `${(item.totalRevenue / max) * 100}%` }}
                  />
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="revenue-chart-empty">
          Chưa có sản phẩm phát sinh doanh thu dương trong kỳ này.
        </p>
      )}
    </section>
  );
}
