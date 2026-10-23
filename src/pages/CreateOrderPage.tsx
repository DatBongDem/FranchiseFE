import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { productService } from "../services/productService";
import { orderService, validateQuantity } from "../services/orderService";
import type { Product } from "../types/product";
import { orderTypes, type DraftOrder, type OrderType } from "../types/order";
import {
  Feedback,
  Modal,
  money,
  PageTitle,
  Pagination,
  SearchInput,
} from "../components/ui";

export default function CreateOrderPage() {
  const { user } = useAuth();
  const storeId = user?.idStore || "";
  const navigate = useNavigate();
  const [order, setOrder] = useState<DraftOrder>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<OrderType>("Normal");
  const [note, setNote] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(6);
  const [adding, setAdding] = useState<Product>();
  const [addQuantity, setAddQuantity] = useState("1");
  const [removing, setRemoving] = useState<string>();
  const [confirmSend, setConfirmSend] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const apply = (draft: DraftOrder) => {
    setOrder(draft);
    setQuantities(
      Object.fromEntries(
        draft.productBatches.map((b) => [b.productId, String(b.qualityOrder)]),
      ),
    );
  };
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setLoadError("");
    try {
      const [draft, catalog] = await Promise.all([
        orderService.current(storeId),
        productService.list(),
      ]);
      if (generation.current !== version) return;
      apply(draft);
      setProducts(catalog);
      setType(draft.type || "Normal");
      setNote(draft.note || "");
    } catch (err) {
      if (generation.current === version) {
        setOrder(undefined);
        setLoadError((err as Error).message);
      }
    } finally {
      if (generation.current === version) setLoading(false);
    }
  }, [storeId]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const dirtyQuantities =
    order?.productBatches.some(
      (b) => quantities[b.productId] !== String(b.qualityOrder),
    ) ?? false;
  const dirty =
    !!order &&
    (note !== (order.note || "") || type !== order.type || dirtyQuantities);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  async function mutate(
    action: () => Promise<void>,
    message: string,
    savedProductId?: string,
  ) {
    if (!order || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    let failed = "";
    try {
      await action();
      setNotice(message);
    } catch (err) {
      failed = (err as Error).message;
    }
    // Reconcile after both success and failure; a failed response may still have saved data.
    try {
      const fresh = await orderService.details(order.orderId, storeId);
      if (fresh.status !== "Creating")
        throw new Error(
          "Đơn đã được gửi hoặc đổi trạng thái. Hãy quay lại danh sách đơn.",
        );
      setOrder(fresh);
      setQuantities((previous) =>
        Object.fromEntries(
          fresh.productBatches.map((batch) => {
            const original = order.productBatches.find(
              (item) => item.productId === batch.productId,
            );
            const preserve =
              batch.productId !== savedProductId &&
              original &&
              previous[batch.productId] !== String(original.qualityOrder);
            return [
              batch.productId,
              preserve ? previous[batch.productId] : String(batch.qualityOrder),
            ];
          }),
        ),
      );
    } catch (err) {
      setOrder(undefined);
      setLoadError(
        `Không thể xác nhận trạng thái đơn: ${(err as Error).message}`,
      );
    }
    setError(failed);
    setAdding(undefined);
    setRemoving(undefined);
    setBusy(false);
    lock.current = false;
  }
  async function send() {
    if (!order || lock.current || dirtyQuantities) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await orderService.send(order.orderId, storeId, type, note);
      navigate("/orders", {
        replace: true,
        state: { createdOrderId: order.orderId },
      });
    } catch (err) {
      setError((err as Error).message);
      setConfirmSend(false);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const filtered = products.filter(
    (p) =>
      p.productName
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!category || p.categoryId === category),
  );
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  const categories = [
    ...new Map(
      products.map((p) => [p.categoryId, p.categoryName || "Chưa phân loại"]),
    ).entries(),
  ];
  return (
    <>
      <PageTitle
        eyebrow="ĐƠN HÀNG / TẠO ĐƠN"
        title="Chuẩn bị cho ngày mới"
        description="Chọn sản phẩm cho cửa hàng, hoàn thiện đơn nháp và gửi đến bộ phận điều phối."
      >
        <Link
          className="button secondary"
          to="/orders"
          onClick={(e) => {
            if (
              busy ||
              (dirty &&
                !window.confirm(
                  "Thông tin chưa lưu sẽ bị mất. Bạn muốn quay lại?",
                ))
            )
              e.preventDefault();
          }}
        >
          <ArrowLeft size={16} /> Danh sách đơn
        </Link>
      </PageTitle>
      <Feedback loading={loading} error={loadError} retry={load} />
      {!loading && order && !loadError && (
        <>
          <div className="draft-banner">
            <ShoppingBag size={25} />
            <div>
              <strong>
                Đơn nháp #{order.orderId.slice(0, 8).toUpperCase()}
              </strong>
              <p>
                Đơn nháp dùng chung của cửa hàng. Các món được lưu ngay sau mỗi
                thao tác thêm, lưu số lượng hoặc xóa.
              </p>
            </div>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Tải lại sẽ bỏ các chỉnh sửa chưa lưu. Tiếp tục?",
                  )
                )
                  void load();
              }}
            >
              <RefreshCw size={15} /> Tải lại
            </button>
          </div>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          <div className="create-order-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Chọn sản phẩm</h2>
                <span className="muted">{filtered.length} sản phẩm</span>
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
                  aria-label="Danh mục sản phẩm"
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
              </div>
              {!filtered.length && <Feedback empty />}
              <div className="order-catalog">
                {filtered
                  .slice((current - 1) * size, current * size)
                  .map((p) => {
                    const exists = order.productBatches.some(
                      (b) =>
                        b.productId.toLowerCase() === p.productId.toLowerCase(),
                    );
                    return (
                      <article key={p.productId}>
                        <span className="leaf-icon">
                          <ShoppingBag size={20} />
                        </span>
                        <div>
                          <h3>{p.productName}</h3>
                          <small>
                            {p.categoryName || "Chưa phân loại"} ·{" "}
                            {p.unit || "Phần"}
                          </small>
                          <strong>{money(p.price)}</strong>
                        </div>
                        <button
                          className={`button small ${exists ? "secondary" : "primary"}`}
                          disabled={busy || exists || dirtyQuantities}
                          onClick={() => {
                            setAdding(p);
                            setAddQuantity("1");
                            setError("");
                          }}
                        >
                          {exists ? <Check size={15} /> : <Plus size={15} />}{" "}
                          {exists ? "Đã chọn" : "Thêm"}
                        </button>
                      </article>
                    );
                  })}
              </div>
              <Pagination
                page={current}
                size={size}
                total={filtered.length}
                onPage={setPage}
                onSize={(v) => {
                  setSize(v);
                  setPage(1);
                }}
              />
            </section>
            <section className="panel order-summary">
              <div className="panel-heading">
                <h2>Đơn hàng của cửa hàng</h2>
                <span className="count">{order.productBatches.length} món</span>
              </div>
              <div className="order-summary-body">
                {!order.productBatches.length && <Feedback empty />}
                {order.productBatches.map((b) => (
                  <div className="draft-line" key={b.batchId}>
                    <div>
                      <strong>{b.productName || b.productId}</strong>
                      <span>{money(b.price)}</span>
                    </div>
                    <div className="quantity-row">
                      <label>
                        Số lượng ({b.unit || "phần"})
                        <input
                          aria-label={`Số lượng ${b.productName}`}
                          type="number"
                          min="1"
                          max="2147483647"
                          step="1"
                          disabled={busy}
                          value={quantities[b.productId] ?? ""}
                          onChange={(e) =>
                            setQuantities((q) => ({
                              ...q,
                              [b.productId]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        className="button small secondary"
                        disabled={
                          busy ||
                          quantities[b.productId] === String(b.qualityOrder)
                        }
                        onClick={() => {
                          const qty = Number(quantities[b.productId]);
                          try {
                            validateQuantity(qty);
                          } catch (err) {
                            setError((err as Error).message);
                            return;
                          }
                          void mutate(
                            () =>
                              orderService.setQuantity(
                                order.orderId,
                                storeId,
                                b.productId,
                                qty,
                              ),
                            "Đã lưu số lượng.",
                            b.productId,
                          );
                        }}
                      >
                        <Save size={15} /> Lưu
                      </button>
                      <button
                        className="icon-button"
                        title={`Xóa ${b.productName}`}
                        disabled={busy || dirtyQuantities}
                        onClick={() => setRemoving(b.productId)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
                {dirtyQuantities && (
                  <p className="inline-error">
                    Lưu các số lượng đang chỉnh sửa trước khi thêm/xóa món hoặc
                    gửi đơn.
                  </p>
                )}
                <div className="draft-fields">
                  <label>
                    Loại đơn
                    <select
                      value={type}
                      disabled={busy}
                      onChange={(e) => setType(e.target.value as OrderType)}
                    >
                      {Object.entries(orderTypes).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ghi chú
                    <textarea
                      rows={3}
                      value={note}
                      disabled={busy}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Yêu cầu chuẩn bị hoặc lưu ý cho đơn hàng…"
                    />
                  </label>
                </div>
                <div className="order-total">
                  <span>Tổng giá trị</span>
                  <strong>{money(order.totalAmount)}</strong>
                </div>
                <p className="muted order-price-note">
                  Tổng tiền được tính theo giá nhập sản phẩm và số lượng đã lưu
                  trên hệ thống.
                </p>
                <div className="draft-buttons">
                  <button
                    className="button secondary"
                    disabled={busy || dirtyQuantities}
                    onClick={() =>
                      void mutate(
                        () =>
                          orderService.save(order.orderId, storeId, type, note),
                        "Đã lưu thông tin đơn nháp.",
                      )
                    }
                  >
                    <Save size={16} /> Lưu nháp
                  </button>
                  <button
                    className="button primary"
                    disabled={
                      busy || dirtyQuantities || !order.productBatches.length
                    }
                    onClick={() => setConfirmSend(true)}
                  >
                    <Send size={16} /> {busy ? "Đang xử lý…" : "Gửi đơn hàng"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
      {adding && order && (
        <Modal
          title={`Thêm ${adding.productName}`}
          onClose={() => {
            if (!busy) setAdding(undefined);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const qty = Number(addQuantity);
              try {
                validateQuantity(qty);
              } catch (err) {
                setError((err as Error).message);
                return;
              }
              void mutate(
                () =>
                  orderService.add(
                    order.orderId,
                    storeId,
                    adding.productId,
                    qty,
                  ),
                "Đã thêm sản phẩm vào đơn.",
              );
            }}
          >
            <p>
              Đơn giá nhập: {money(adding.price)} / {adding.unit || "phần"}
            </p>
            <label>
              Số lượng
              <input
                autoFocus
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required
                disabled={busy}
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setAdding(undefined)}
              >
                Hủy
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Đang thêm…" : "Thêm vào đơn"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {removing && order && (
        <Modal
          title="Xóa món khỏi đơn nháp"
          onClose={() => {
            if (!busy) setRemoving(undefined);
          }}
        >
          <p>
            Xóa{" "}
            <strong>
              {
                order.productBatches.find((b) => b.productId === removing)
                  ?.productName
              }
            </strong>{" "}
            khỏi đơn? Bạn có thể thêm lại sản phẩm sau.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setRemoving(undefined)}
            >
              Giữ lại
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void mutate(
                  () =>
                    orderService.setQuantity(
                      order.orderId,
                      storeId,
                      removing,
                      0,
                    ),
                  "Đã xóa món khỏi đơn.",
                )
              }
            >
              Xóa món
            </button>
          </div>
        </Modal>
      )}
      {confirmSend && order && (
        <Modal
          title="Gửi đơn đến bộ phận điều phối"
          onClose={() => {
            if (!busy) setConfirmSend(false);
          }}
        >
          <p>
            Gửi đơn <strong>#{order.orderId.slice(0, 8).toUpperCase()}</strong>{" "}
            gồm {order.productBatches.length} món, tổng giá trị đã lưu{" "}
            <strong>{money(order.totalAmount)}</strong>?
          </p>
          <p>
            Ghi chú và loại đơn sẽ được lưu trước khi gửi. Sau khi gửi, bạn
            không thể chỉnh sửa món trên đơn này.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmSend(false)}
            >
              Kiểm tra lại
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void send()}
            >
              {busy ? "Đang gửi…" : "Xác nhận gửi"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
