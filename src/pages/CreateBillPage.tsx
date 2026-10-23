import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import {
  billService,
  BillUncertainError,
  salePrice,
  validateBillStock,
} from "../services/billService";
import {
  billAttemptKey,
  readBillAttempt,
  writeBillAttempt,
} from "../services/billAttempt";
import { productService } from "../services/productService";
import type { BillAttempt, BillItem } from "../types/bill";
import BillReceipt from "../components/BillReceipt";
import {
  date,
  Feedback,
  Modal,
  money,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";

export default function CreateBillPage() {
  const { user } = useAuth();
  const cashier = user!;
  const key = billAttemptKey(cashier.id, cashier.idStore || "");
  const [attempt, setAttempt] = useState<BillAttempt | null>(() => {
    try {
      return readBillAttempt(key);
    } catch {
      return { status: "pending", startedAt: "" };
    }
  });
  const [cart, setCart] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [inStock, setInStock] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySize, setHistorySize] = useState(6);
  const [viewId, setViewId] = useState<string>();
  const catalog = useResource(async () => {
    const [products, stock] = await Promise.all([
      productService.list(),
      billService.stock(cashier),
    ]);
    return { products, stock };
  }, [cashier.id, cashier.idStore]);
  const history = useResource(
    () => billService.history(cashier, historyPage, historySize),
    [cashier.id, cashier.idStore, historyPage, historySize],
  );
  const receipt = useResource(
    () =>
      viewId
        ? billService.receipt(cashier, viewId)
        : Promise.resolve(undefined),
    [viewId, cashier.id, cashier.idStore],
  );
  const blocked = busy || !!attempt;
  const items: BillItem[] = Object.entries(cart).map(
    ([productId, quantity]) => ({ productId, quantity: Number(quantity) }),
  );
  const products = catalog.data?.products || [];
  const stock = catalog.data?.stock || [];
  const productFor = (id: string) => products.find((p) => p.productId === id);
  const stockFor = (id: string) =>
    stock.find((s) => s.productId.toLowerCase() === id.toLowerCase())
      ?.totalQuantity || 0;
  let validation = "";
  try {
    validateBillStock(items, stock);
    for (const item of items) {
      const product = productFor(item.productId);
      if (
        !product ||
        !Number.isFinite(salePrice(product)) ||
        salePrice(product) < 0
      )
        throw new Error(
          "Có sản phẩm không còn hợp lệ. Hãy tải lại danh mục hoặc bỏ sản phẩm đó.",
        );
    }
  } catch (err) {
    validation = (err as Error).message;
  }
  const estimate = items.reduce((total, item) => {
    const product = productFor(item.productId);
    return (
      total +
      (product && Number.isFinite(item.quantity) && item.quantity > 0
        ? salePrice(product) * item.quantity
        : 0)
    );
  }, 0);
  const filtered = products.filter(
    (p) =>
      p.productName
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!category || p.categoryId === category) &&
      (!inStock || stockFor(p.productId) > 0),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  const categories = [
    ...new Map(
      products.map((p) => [p.categoryId, p.categoryName || "Chưa phân loại"]),
    ).entries(),
  ];
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (busy || (Object.keys(cart).length && !attempt)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, cart, attempt]);
  async function create() {
    if (lock.current || attempt || validation || !catalog.data) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const pending: BillAttempt = {
      status: "pending",
      startedAt: new Date().toISOString(),
    };
    try {
      // Persist BEFORE sending. Reloading this tab must not accidentally create a second bill.
      writeBillAttempt(key, pending);
      setAttempt(pending);
    } catch {
      setError(
        "Không lưu được trạng thái giao dịch trên trình duyệt. Hóa đơn chưa được gửi; hãy kiểm tra quyền lưu trữ rồi thử lại.",
      );
      setBusy(false);
      setConfirm(false);
      lock.current = false;
      return;
    }
    try {
      const billId = await billService.create(cashier, items, note);
      const created: BillAttempt = {
        status: "created",
        startedAt: pending.startedAt,
        billId,
      };
      setAttempt(created);
      setCart({});
      setNote("");
      setViewId(billId);
      try {
        writeBillAttempt(key, created);
      } catch {
        setError(
          `Đã tạo hóa đơn ${billId}, nhưng không lưu được mã trên trình duyệt. Hãy giữ mã này để tra cứu.`,
        );
      }
    } catch (err) {
      setError((err as Error).message);
      if (!(err instanceof BillUncertainError)) {
        try {
          writeBillAttempt(key, null);
          setAttempt(null);
        } catch {
          setError(
            "Không thể cập nhật trạng thái trình duyệt. Hãy đối chiếu lịch sử trước khi thực hiện giao dịch mới.",
          );
        }
      }
    } finally {
      setBusy(false);
      setConfirm(false);
      lock.current = false;
      void catalog.reload();
      void history.reload();
    }
  }
  function reset() {
    try {
      writeBillAttempt(key, null);
      setAttempt(null);
      setCart({});
      setNote("");
      setError("");
      setResetConfirm(false);
      void catalog.reload();
      void history.reload();
    } catch {
      setError(
        "Không xóa được trạng thái giao dịch trên trình duyệt. Vui lòng kiểm tra quyền lưu trữ.",
      );
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CỬA HÀNG / BÁN HÀNG"
        title="Một hóa đơn, trọn trải nghiệm"
        description="Chọn sản phẩm còn tồn tại cửa hàng, kiểm tra số lượng và lập hóa đơn bán hàng."
      >
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void catalog.reload()}
        >
          <RefreshCw size={16} /> Tải lại tồn kho
        </button>
      </PageTitle>
      {attempt?.status === "created" && (
        <div className="bill-success" role="status">
          <CheckCircle2 size={27} />
          <div>
            <strong>Đã tạo hóa đơn thành công</strong>
            <p>Mã hóa đơn: {attempt.billId}</p>
          </div>
          <button
            className="button secondary"
            onClick={() => setViewId(attempt.billId)}
          >
            Xem / in hóa đơn
          </button>
          <button className="button primary" onClick={reset}>
            <Plus size={16} /> Hóa đơn mới
          </button>
        </div>
      )}
      {attempt?.status === "pending" && !busy && (
        <div className="bill-uncertain" role="alert">
          <strong>Cần đối chiếu kết quả giao dịch</strong>
          <p>
            Lần tạo hóa đơn{" "}
            {attempt.startedAt ? `lúc ${date(attempt.startedAt)}` : "trước"}{" "}
            chưa có kết quả xác nhận. Kiểm tra danh sách hóa đơn của bạn bên
            dưới trước khi thực hiện giao dịch mới để tránh tạo trùng.
          </p>
          <div className="row-actions">
            <button
              className="button secondary"
              onClick={() => {
                setHistoryPage(1);
                void history.reload();
              }}
            >
              Tải lại lịch sử
            </button>
            <button
              className="button secondary"
              onClick={() => setResetConfirm(true)}
            >
              Đã đối chiếu, tạo giao dịch mới
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {!attempt && (
        <>
          <Feedback
            loading={catalog.loading}
            error={catalog.error}
            retry={catalog.reload}
          />
          {!catalog.loading && !catalog.error && catalog.data && (
            <div className="create-order-grid bill-pos">
              <section className="panel">
                <div className="panel-heading">
                  <h2>Sản phẩm bán tại cửa hàng</h2>
                  <span className="count">{filtered.length}</span>
                </div>
                <div className="toolbar wrap">
                  <SearchInput
                    value={search}
                    onChange={(v) => {
                      setSearch(v);
                      setPage(1);
                    }}
                  />
                  <select
                    aria-label="Danh mục bán hàng"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <label className="stock-toggle">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => {
                        setInStock(e.target.checked);
                        setPage(1);
                      }}
                    />{" "}
                    Chỉ còn hàng
                  </label>
                </div>
                {!filtered.length && <Feedback empty />}
                <div className="order-catalog">
                  {filtered
                    .slice((currentPage - 1) * size, currentPage * size)
                    .map((p) => {
                      const available = stockFor(p.productId);
                      const quantity = Number(cart[p.productId] || 0);
                      return (
                        <article key={p.productId}>
                          <span className="leaf-icon">
                            <ShoppingBag size={20} />
                          </span>
                          <div>
                            <h3>{p.productName}</h3>
                            <small>
                              {p.categoryName || "Chưa phân loại"} · Còn{" "}
                              {available} {p.unit || "phần"}
                            </small>
                            <strong>{money(salePrice(p))}</strong>
                          </div>
                          <button
                            className="button small primary"
                            disabled={
                              blocked ||
                              !Number.isFinite(quantity) ||
                              quantity < 0 ||
                              quantity + 1 > available
                            }
                            onClick={() =>
                              setCart((prev) => ({
                                ...prev,
                                [p.productId]: String(
                                  Number(prev[p.productId] || 0) + 1,
                                ),
                              }))
                            }
                          >
                            <Plus size={15} /> Thêm
                          </button>
                        </article>
                      );
                    })}
                </div>
                <Pagination
                  page={currentPage}
                  total={filtered.length}
                  size={size}
                  onPage={setPage}
                  onSize={(v) => {
                    setSize(v);
                    setPage(1);
                  }}
                />
              </section>
              <section className="panel order-summary">
                <div className="panel-heading">
                  <h2>Hóa đơn hiện tại</h2>
                  <ReceiptText size={22} color="#e9522d" />
                </div>
                <div className="order-summary-body">
                  {!items.length && (
                    <div className="bill-empty">
                      <ShoppingBag size={38} />
                      <strong>Chưa có sản phẩm</strong>
                      <p>Thêm món từ danh sách bên cạnh để bắt đầu.</p>
                    </div>
                  )}
                  {items.map((item) => {
                    const p = productFor(item.productId);
                    const available = stockFor(item.productId);
                    return (
                      <div className="draft-line" key={item.productId}>
                        <div>
                          <strong>{p?.productName || item.productId}</strong>
                          <span>
                            {p &&
                            Number.isFinite(item.quantity) &&
                            item.quantity > 0
                              ? money(salePrice(p) * item.quantity)
                              : "—"}
                          </span>
                        </div>
                        <small className="bill-unit-price">
                          {p ? money(salePrice(p)) : "—"} / {p?.unit || "phần"}{" "}
                          · Tồn: {available}
                        </small>
                        <div className="quantity-row">
                          <label>
                            Số lượng
                            <input
                              aria-label={`Số lượng ${p?.productName || item.productId}`}
                              type="number"
                              min="1"
                              max={Math.min(2147483647, available)}
                              step="1"
                              disabled={blocked}
                              value={cart[item.productId]}
                              onChange={(e) =>
                                setCart((prev) => ({
                                  ...prev,
                                  [item.productId]: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <button
                            className="icon-button"
                            aria-label={`Bỏ ${p?.productName || item.productId}`}
                            disabled={blocked}
                            onClick={() =>
                              setCart((prev) => {
                                const next = { ...prev };
                                delete next[item.productId];
                                return next;
                              })
                            }
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="draft-fields">
                    <label>
                      Ghi chú hóa đơn
                      <textarea
                        rows={3}
                        disabled={blocked}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ghi chú cho giao dịch…"
                      />
                    </label>
                  </div>
                  <div className="order-total">
                    <span>Tạm tính</span>
                    <strong>{money(estimate)}</strong>
                  </div>
                  <p className="order-price-note muted">
                    Giá trị chính thức được xác định khi tạo hóa đơn. Tồn kho có
                    thể thay đổi theo các giao dịch khác.
                  </p>
                  {items.length > 0 && validation && (
                    <p className="inline-error" role="alert">
                      {validation}
                    </p>
                  )}
                  <button
                    className="button primary bill-submit"
                    disabled={
                      blocked ||
                      !!validation ||
                      catalog.loading ||
                      !!catalog.error
                    }
                    onClick={() => setConfirm(true)}
                  >
                    <ReceiptText size={18} /> Kiểm tra và tạo hóa đơn
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      )}
      <section className="panel bill-history">
        <div className="panel-heading">
          <div>
            <h2>Hóa đơn của tôi</h2>
            <p>
              Đối chiếu các hóa đơn do tài khoản của bạn tạo, mới nhất trước.
            </p>
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void history.reload()}
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>
        <Feedback
          loading={history.loading}
          error={history.error}
          empty={!history.data?.data.length}
          retry={history.reload}
        />
        {!history.loading && !history.error && history.data && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>MÃ HÓA ĐƠN</th>
                    <th>THỜI GIAN TẠO</th>
                    <th>CỬA HÀNG</th>
                    <th>TỔNG TIỀN</th>
                    <th>CHI TIẾT</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.data.map((bill) => (
                    <tr key={bill.billId}>
                      <td>
                        <strong title={bill.billId}>
                          #{bill.billId.slice(0, 8).toUpperCase()}
                        </strong>
                      </td>
                      <td>{date(bill.createdTime)}</td>
                      <td>{bill.storeName}</td>
                      <td className="amount">{money(bill.totalAmount)}</td>
                      <td>
                        <button
                          className="text-button"
                          disabled={
                            busy ||
                            bill.storeId?.toLowerCase() !==
                              cashier.idStore?.toLowerCase()
                          }
                          title={
                            bill.storeId?.toLowerCase() !==
                            cashier.idStore?.toLowerCase()
                              ? "Hóa đơn thuộc cửa hàng khác"
                              : undefined
                          }
                          onClick={() => setViewId(bill.billId)}
                        >
                          Xem / in
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={historyPage}
              total={history.data.totalRecords}
              size={historySize}
              onPage={setHistoryPage}
              onSize={(v) => {
                setHistorySize(v);
                setHistoryPage(1);
              }}
            />
          </>
        )}
      </section>
      {confirm && (
        <Modal
          title="Xác nhận tạo hóa đơn"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            Ghi nhận hóa đơn gồm <strong>{items.length} sản phẩm</strong>, tạm
            tính <strong>{money(estimate)}</strong>?
          </p>
          <p>Tồn kho sẽ được trừ khi hóa đơn được tạo thành công.</p>
          {note.trim() && (
            <p className="receipt-note">
              <b>Ghi chú:</b> {note}
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Kiểm tra lại
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void create()}
            >
              {busy ? "Đang tạo hóa đơn…" : "Xác nhận tạo"}
            </button>
          </div>
        </Modal>
      )}
      {resetConfirm && (
        <Modal
          title="Bắt đầu giao dịch mới"
          onClose={() => setResetConfirm(false)}
        >
          <p>
            Chỉ tiếp tục sau khi đã kiểm tra lịch sử để xác định giao dịch trước
            có tạo hóa đơn hay chưa. Giỏ hàng hiện tại sẽ được xóa.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setResetConfirm(false)}
            >
              Quay lại đối chiếu
            </button>
            <button className="button primary" onClick={reset}>
              Đã kiểm tra, bắt đầu mới
            </button>
          </div>
        </Modal>
      )}
      {viewId && (
        <Modal title="Chi tiết hóa đơn" onClose={() => setViewId(undefined)}>
          <Feedback
            loading={receipt.loading}
            error={receipt.error}
            retry={receipt.reload}
          />
          {!receipt.loading &&
            !receipt.error &&
            receipt.data &&
            receipt.data.billId.toLowerCase() === viewId.toLowerCase() && (
              <BillReceipt bill={receipt.data} />
            )}
        </Modal>
      )}
    </>
  );
}
