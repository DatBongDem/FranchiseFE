import { useState, type FormEvent } from "react";
import { ReceiptText, RefreshCw, Coins, CalendarDays } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  Feedback,
  Modal,
  money,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";
import {
  historyParams,
  searchStoreBills,
  storeBillService,
  type StoreBill,
  type StoreBillQuery,
} from "../services/storeBillService";
const initial: StoreBillQuery = { from: "", to: "", page: 1, size: 6 };
const time = (s: string) =>
  new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export default function StoreBillHistoryPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState(initial);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StoreBill>();
  const resource = useResource(
    () => storeBillService.history(user!, query),
    [user!.role, user!.idStore, query],
  );
  const data = resource.data;
  const rows = searchStoreBills(data?.data || [], search);
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
        eyebrow="CỬA HÀNG / HÓA ĐƠN"
        title="Lịch sử hóa đơn"
        description="Tra cứu giao dịch bán hàng và chi tiết sản phẩm tại cửa hàng bạn quản lý."
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
          <strong>Mỗi giao dịch, một bản ghi rõ ràng</strong>
          <p>
            Cửa hàng #{user!.idStore?.slice(0, 8).toUpperCase() || "—"} · Ngày
            và giờ hiển thị theo Việt Nam (UTC+7).
          </p>
        </div>
      </div>
      <section className="panel store-bill-filters">
        <h2>Khoảng thời gian lập hóa đơn</h2>
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
          Đang xem: {query.from || "Từ đầu"} → {query.to || "Hiện tại"}. Hóa đơn
          mới nhất hiển thị trước.
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
              <span>Hóa đơn trong khoảng ngày</span>
              <strong>{data.totalRecords.toLocaleString("vi-VN")}</strong>
            </article>
            <article className="panel">
              <CalendarDays />
              <span>Hóa đơn trên trang này</span>
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
                <h2>Danh sách hóa đơn</h2>
                <p>Tìm mã hóa đơn hoặc tên sản phẩm trong trang hiện tại.</p>
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
                    ? "Chưa có hóa đơn trong khoảng ngày này"
                    : "Không có hóa đơn phù hợp trên trang này"}
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
                      <th>MÃ HÓA ĐƠN</th>
                      <th>THỜI GIAN LẬP</th>
                      <th>DÒNG SẢN PHẨM</th>
                      <th>TỔNG TIỀN</th>
                      <th>CHI TIẾT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((b) => (
                      <tr key={b.billId}>
                        <td>
                          <strong title={b.billId}>
                            #{b.billId.slice(0, 8).toUpperCase()}
                          </strong>
                          <small>
                            {b.details[0]?.productName || "Chưa có chi tiết"}
                            {b.details.length > 1
                              ? ` +${b.details.length - 1} dòng`
                              : ""}
                          </small>
                        </td>
                        <td>{time(b.createdTime)}</td>
                        <td>{b.details.length}</td>
                        <td className="amount">{money(b.totalAmount)}</td>
                        <td>
                          <button
                            className="button secondary"
                            onClick={() => setSelected(b)}
                            aria-label={`Xem hóa đơn ${b.billId}`}
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
        <Modal title="Chi tiết hóa đơn" onClose={() => setSelected(undefined)}>
          <div className="store-bill-detail">
            <p className="store-bill-id">Mã: {selected.billId}</p>
            <p>{time(selected.createdTime)} · Giờ Việt Nam</p>
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
                    <tr key={d.billDetailId || i}>
                      <td>{d.productName}</td>
                      <td>{d.quantity.toLocaleString("vi-VN")}</td>
                      <td>{money(d.unitPrice)}</td>
                      <td>{money(d.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!selected.details.length && (
              <p>Hóa đơn chưa có dòng chi tiết được trả về.</p>
            )}
            <div className="receipt-total">
              <span>Tổng hóa đơn</span>
              <strong>{money(selected.totalAmount)}</strong>
            </div>
            <p>
              Một sản phẩm có thể xuất hiện nhiều dòng do lấy từ các lô hàng
              khác nhau.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
