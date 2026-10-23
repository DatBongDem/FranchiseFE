import { useState, type FormEvent } from "react";
import { ReceiptText, RefreshCw, Coins, CalendarDays } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  Badge,
  Feedback,
  Modal,
  money,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import {
  historyParams,
  searchStoreOrders,
  storeOrderService,
  type StoreOrder,
  type StoreOrderQuery,
} from "../services/storeOrderService";
const initial: StoreOrderQuery = { from: "", to: "", page: 1, size: 6 };
const time = (s: string | null) =>
  s === null
    ? "Chưa gửi"
    : new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export default function StoreOrderHistoryPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState(initial);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StoreOrder>();
  const resource = useResource(
    () => storeOrderService.history(user!, query),
    [user!.role, user!.idStore, query],
  );
  const data = resource.data;
  const rows = searchStoreOrders(data?.data || [], search);
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const next = { ...query, ...draft, page: 1 };
      historyParams(next);
      setQuery(next);
      setSearch("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changePage(page: number, size = query.size) {
    setQuery({ ...query, page, size });
    setSearch("");
  }
  return (
    <>
      <PageTitle
        eyebrow="CỬA HÀNG / ĐƠN HÀNG"
        title="Lịch sử đơn hàng"
        description="Tra cứu đơn đặt hàng và chi tiết sản phẩm tại cửa hàng bạn quản lý."
      >
        <button
          className="button secondary"
          disabled={resource.loading}
          onClick={() => void resource.reload()}
        >
          <RefreshCw size={16} /> Tải lại
        </button>
      </PageTitle>
      <div className="store-bill-banner">
        <ReceiptText size={30} />
        <div>
          <strong>Theo dõi từng đơn đặt hàng</strong>
          <p>
            Cửa hàng #{user!.idStore?.slice(0, 8).toUpperCase() || "—"} · Ngày
            và giờ hiển thị theo Việt Nam (UTC+7).
          </p>
        </div>
      </div>
      <section className="panel store-bill-filters">
        <h2>Khoảng thời gian gửi đơn hàng</h2>
        <p>
          Bộ lọc áp dụng theo ngày gửi đơn. Để xem cả đơn chưa gửi, chọn toàn bộ
          thời gian.
        </p>
        <form onSubmit={submit}>
          <label>
            Từ ngày
            <input
              type="date"
              value={draft.from}
              max={draft.to || undefined}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label>
            Đến hết ngày
            <input
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <button className="button primary">Áp dụng</button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setDraft({ from: "", to: "" });
              setQuery({ ...initial, size: query.size });
              setSearch("");
              setError("");
            }}
          >
            Toàn bộ thời gian
          </button>
        </form>
        <p>
          Đang xem: {query.from || "Từ đầu"} → {query.to || "Hiện tại"}. Đơn
          hàng mới nhất hiển thị trước.
        </p>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
      </section>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && data && (
        <>
          <div className="store-bill-stats">
            <article className="panel">
              <ReceiptText />
              <span>Đơn hàng trong khoảng ngày</span>
              <strong>{data.totalRecords.toLocaleString("vi-VN")}</strong>
            </article>
            <article className="panel">
              <CalendarDays />
              <span>Đơn hàng trên trang này</span>
              <strong>{data.data.length}</strong>
            </article>
            <article className="panel">
              <Coins />
              <span>Tổng tiền trang này (trước tìm kiếm)</span>
              <strong>
                {money(data.data.reduce((s, b) => s + b.totalAmount, 0))}
              </strong>
            </article>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Danh sách đơn hàng</h2>
                <p>Tìm mã đơn hàng hoặc tên sản phẩm trong trang hiện tại.</p>
              </div>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm trong trang này…"
              />
            </div>
            {!rows.length ? (
              <div className="feedback">
                <ReceiptText />
                <b>
                  {data.totalRecords === 0
                    ? "Chưa có đơn hàng trong khoảng ngày này"
                    : "Không có đơn hàng phù hợp trên trang này"}
                </b>
                <span>Thay đổi bộ lọc, xóa tìm kiếm hoặc chọn trang khác.</span>
                {query.page > 1 && (
                  <button
                    className="button secondary"
                    onClick={() => changePage(1)}
                  >
                    Về trang đầu
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>MÃ ĐƠN HÀNG</th>
                      <th>THỜI GIAN GỬI</th>
                      <th>TRẠNG THÁI</th>
                      <th>TỔNG TIỀN</th>
                      <th>CHI TIẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={b.orderId}>
                        <td>
                          <strong title={b.orderId}>
                            #{b.orderId.slice(0, 8).toUpperCase()}
                          </strong>
                          <small>
                            {b.details[0]?.productName || "Chưa có chi tiết"}
                            {b.details.length > 1
                              ? ` +${b.details.length - 1} dòng`
                              : ""}
                          </small>
                        </td>
                        <td>{time(b.createdTime)}</td>
                        <td>
                          <Badge status={b.status} />
                        </td>
                        <td className="amount">{money(b.totalAmount)}</td>
                        <td>
                          <button
                            className="button secondary"
                            onClick={() => setSelected(b)}
                            aria-label={`Xem đơn hàng ${b.orderId}`}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={query.page}
              size={query.size}
              total={data.totalRecords}
              onPage={(p) => changePage(p)}
              onSize={(s) => changePage(1, s)}
            />
          </section>
        </>
      )}
      {selected && (
        <Modal title="Chi tiết đơn hàng" onClose={() => setSelected(undefined)}>
          <div className="store-bill-detail">
            <p className="store-bill-id">Mã: {selected.orderId}</p>
            <p>{time(selected.createdTime)} · Giờ Việt Nam</p>
            <p>Người gửi: {selected.orderBy || "Chưa có"}</p>
            <Badge status={selected.status} />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>SL</th>
                    <th>ĐƠN GIÁ</th>
                    <th>THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.details.map((d, i) => (
                    <tr key={d.batchId || i}>
                      <td>{d.productName}</td>
                      <td>{d.quantity.toLocaleString("vi-VN")}</td>
                      <td>{money(d.unitPrice)}</td>
                      <td>{money(d.quantity * d.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!selected.details.length && (
              <p>Đơn hàng chưa có dòng chi tiết được trả về.</p>
            )}
            <div className="receipt-total">
              <span>Tổng đơn hàng</span>
              <strong>{money(selected.totalAmount)}</strong>
            </div>
            <p>Chi tiết được hiển thị theo từng lô sản phẩm của đơn hàng.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
