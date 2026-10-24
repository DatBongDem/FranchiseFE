import { useState, type FormEvent } from "react";
import { Modal } from "./ui";
import { roles, roleLabels, type Role } from "../types/user";
import { userManageService, type CreateUserPayload, type UpdateUserPayload } from "../services/userManageService";
import type { Store } from "../services/storeService";
import type { User } from "../types/user";

const STORE_ROLES: Role[] = ["STORESTAFF", "MANAGER"];

function StoreSelect({ value, onChange, stores }: { value: string; onChange: (v: string) => void; stores: Store[] }) {
  return (
    <label className="field">
      <span>Cửa hàng</span>
      <select id="user-store" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Không gán cửa hàng —</option>
        {stores.map((s) => (
          <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
        ))}
      </select>
    </label>
  );
}

export function CreateUserModal({
  stores,
  onClose,
  onDone,
}: {
  stores: Store[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STORESTAFF");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("");
  const [idStore, setIdStore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsStore = STORE_ROLES.includes(role);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: CreateUserPayload = {
        name: name.trim(),
        gmail: gmail.trim(),
        password,
        role,
        phoneNumber: phone.trim() || undefined,
        address: address.trim() || undefined,
        gender: gender || undefined,
        idStore: needsStore && idStore ? idStore : undefined,
      };
      await userManageService.create(payload);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Tạo tài khoản mới" onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="modal-body modal-form-grid">
          <label className="field">
            <span>Họ tên <span className="required">*</span></span>
            <input id="create-user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" required autoFocus />
          </label>
          <label className="field">
            <span>Email (Gmail) <span className="required">*</span></span>
            <input id="create-user-gmail" type="email" value={gmail} onChange={(e) => setGmail(e.target.value)} placeholder="example@gmail.com" required />
          </label>
          <label className="field">
            <span>Mật khẩu <span className="required">*</span></span>
            <input id="create-user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </label>
          <label className="field">
            <span>Vai trò <span className="required">*</span></span>
            <select id="create-user-role" value={role} onChange={(e) => { setRole(e.target.value as Role); setIdStore(""); }}>
              {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input id="create-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xxxxxxxxx" />
          </label>
          <label className="field">
            <span>Giới tính</span>
            <select id="create-user-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">— Không chỉ định —</option>
              <option value="Male">Nam</option>
              <option value="Female">Nữ</option>
              <option value="Other">Khác</option>
            </select>
          </label>
          <label className="field field-full">
            <span>Địa chỉ</span>
            <input id="create-user-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ cư trú" />
          </label>
          {needsStore && (
            <div className="field-full">
              <StoreSelect value={idStore} onChange={setIdStore} stores={stores} />
            </div>
          )}
          {error && <p className="inline-error field-full" role="alert">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Hủy</button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Đang tạo…" : "Tạo tài khoản"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function EditUserModal({
  user,
  stores,
  onClose,
  onDone,
}: {
  user: User;
  stores: Store[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(user.name || "");
  const [role, setRole] = useState<Role>(user.role);
  const [phone, setPhone] = useState(user.phoneNumber || "");
  const [idStore, setIdStore] = useState(user.idStore || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsStore = STORE_ROLES.includes(role);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: UpdateUserPayload = {
        name: name.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        role,
        idStore: needsStore && idStore ? idStore : undefined,
      };
      await userManageService.update(user.id, payload);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Sửa tài khoản: ${user.name}`} onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="modal-body modal-form-grid">
          <label className="field">
            <span>Họ tên</span>
            <input id="edit-user-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={user.gmail} disabled className="disabled-input" />
          </label>
          <label className="field">
            <span>Vai trò</span>
            <select id="edit-user-role" value={role} onChange={(e) => { setRole(e.target.value as Role); setIdStore(""); }}>
              {roles.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input id="edit-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0xxxxxxxxx" />
          </label>
          {needsStore && (
            <div className="field-full">
              <StoreSelect value={idStore} onChange={setIdStore} stores={stores} />
            </div>
          )}
          {error && <p className="inline-error field-full" role="alert">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>Hủy</button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteUserModal({
  user,
  onClose,
  onDone,
}: {
  user: User;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await userManageService.delete(user.id);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Xóa tài khoản" onClose={onClose}>
      <div className="modal-body">
        <p>
          Bạn có chắc muốn xóa tài khoản <strong>{user.name}</strong> ({user.gmail})?
          Hành động này không thể hoàn tác.
        </p>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
      <div className="modal-actions">
        <button className="button secondary" disabled={busy} onClick={onClose}>Hủy</button>
        <button className="button danger" disabled={busy} onClick={() => void confirm()}>
          {busy ? "Đang xóa…" : "Xác nhận xóa"}
        </button>
      </div>
    </Modal>
  );
}
