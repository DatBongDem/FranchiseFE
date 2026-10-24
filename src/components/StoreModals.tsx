import { useState, type FormEvent } from "react";
import { Modal } from "./ui";
import { storeService, type Store } from "../services/storeService";

export function CreateStoreModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (store: Store) => void;
}) {
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await storeService.create(storeName.trim(), address.trim() || undefined);
      onDone({ storeId: "", storeName, address });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Tạo cửa hàng mới" onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="modal-body">
          <label className="field">
            <span>Tên cửa hàng <span className="required">*</span></span>
            <input
              id="create-store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ví dụ: Chi nhánh Quận 1"
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Địa chỉ</span>
            <input
              id="create-store-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ cửa hàng (tuỳ chọn)"
            />
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="button primary" disabled={busy || !storeName.trim()}>
            {busy ? "Đang tạo…" : "Tạo cửa hàng"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function EditStoreModal({
  store,
  onClose,
  onDone,
}: {
  store: Store;
  onClose: () => void;
  onDone: () => void;
}) {
  const [storeName, setStoreName] = useState(store.storeName);
  const [address, setAddress] = useState(store.address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await storeService.update(store.storeId, storeName.trim(), address.trim() || undefined);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Sửa: ${store.storeName}`} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="modal-body">
          <label className="field">
            <span>Tên cửa hàng <span className="required">*</span></span>
            <input
              id="edit-store-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>Địa chỉ</span>
            <input
              id="edit-store-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ cửa hàng (tuỳ chọn)"
            />
          </label>
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="button primary" disabled={busy || !storeName.trim()}>
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteStoreModal({
  store,
  onClose,
  onDone,
}: {
  store: Store;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await storeService.delete(store.storeId);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Xóa cửa hàng" onClose={onClose}>
      <div className="modal-body">
        <p>
          Bạn có chắc muốn xóa cửa hàng <strong>{store.storeName}</strong>?
          Hành động này không thể hoàn tác.
        </p>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Hủy
        </button>
        <button className="button danger" disabled={busy} onClick={() => void confirm()}>
          {busy ? "Đang xóa…" : "Xác nhận xóa"}
        </button>
      </div>
    </Modal>
  );
}
