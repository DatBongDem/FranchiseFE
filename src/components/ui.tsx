import { useEffect, useRef, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
export const date = (value?: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Chưa gửi";
export const statusLabels: Record<string, string> = {
  Creating: "Đang tạo",
  Pending: "Chờ xử lý",
  PickedUp: "Đã lấy hàng",
  WaitingForCooking: "Chờ nấu",
  Cooking: "Đang nấu",
  Cooked: "Đã nấu xong",
  TakenFrom: "Đang giao",
  Arrived: "Đã đến cửa hàng",
  Completed: "Hoàn thành",
  Canceled: "Đã hủy",
  Active: "Hoạt động",
  Blocked: "Đã khóa",
};
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${["Completed", "Active", "Cooked"].includes(status) ? "green" : ["Canceled", "Blocked"].includes(status) ? "red" : "orange"}`}
    >
      <i />
      {statusLabels[status] || status}
    </span>
  );
}
export function Feedback({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div className="feedback" role="status">
        <LoaderCircle className="spin" />
        <b>Đang tải dữ liệu…</b>
        <span>Vui lòng đợi trong giây lát</span>
      </div>
    );
  if (error)
    return (
      <div className="feedback error" role="alert">
        <AlertCircle />
        <b>Chưa thể tải dữ liệu</b>
        <span>{error}</span>
        {retry && (
          <button className="button secondary" onClick={retry}>
            Thử lại
          </button>
        )}
      </div>
    );
  if (empty)
    return (
      <div className="feedback">
        <Inbox />
        <b>Chưa có kết quả</b>
        <span>Thử thay đổi bộ lọc hoặc thêm dữ liệu mới.</span>
      </div>
    );
  return null;
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm theo tên…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button title="Xóa tìm kiếm" onClick={() => onChange("")}>
          <X size={16} />
        </button>
      )}
    </label>
  );
}
export function Pagination({
  page,
  total,
  size,
  onPage,
  onSize,
}: {
  page: number;
  total: number;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        Hiển thị{" "}
        <b>
          {total ? (page - 1) * size + 1 : 0}–{Math.min(page * size, total)}
        </b>{" "}
        / {total} kết quả
      </span>
      <div>
        <select
          aria-label="Số dòng mỗi trang"
          value={size}
          onChange={(e) => onSize(Number(e.target.value))}
        >
          {[6, 12, 24].map((n) => (
            <option key={n} value={n}>
              {n} / trang
            </option>
          ))}
        </select>
        <button
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          aria-label="Trang sau"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      <div className="title-actions">{children}</div>
    </div>
  );
}
