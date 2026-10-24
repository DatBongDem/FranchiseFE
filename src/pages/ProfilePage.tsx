import { useState, useRef, type ChangeEvent } from "react";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Store as StoreIcon,
  Camera,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { authService } from "../services/authService";
import { storeService } from "../services/storeService";
import { roleLabels } from "../types/user";
import { Badge, PageTitle } from "../components/ui";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const stores = useResource(storeService.getAll);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const currentStore = stores.data?.find(
    (s) => s.storeId.toLowerCase() === user?.idStore?.toLowerCase()
  );

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ảnh không được vượt quá 5MB.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      await authService.uploadAvatar(file);
      await refreshUser();
      setUploadSuccess("Đã cập nhật ảnh đại diện thành công!");
    } catch (err) {
      setUploadError((err as Error).message || "Không thể tải lên ảnh đại diện.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!user) return null;

  return (
    <>
      <PageTitle
        eyebrow="TÀI KHOẢN / CÁ NHÂN"
        title="Hồ sơ người dùng"
        description="Thông tin cá nhân, vai trò phân quyền và hình ảnh đại diện trong hệ thống."
      >
        <button
          className="button secondary"
          onClick={() => void refreshUser()}
          title="Tải lại thông tin"
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </PageTitle>

      {uploadSuccess && (
        <div className="notice" role="status">
          <CheckCircle2 size={16} /> {uploadSuccess}
        </div>
      )}

      {uploadError && (
        <div className="notice error" role="alert">
          {uploadError}
        </div>
      )}

      <div className="profile-layout">
        {/* Left Card: Avatar & Summary */}
        <section className="panel profile-card">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.name?.charAt(0).toUpperCase() || "F"}</span>
              )}
            </div>
            <button
              type="button"
              className="avatar-upload-badge"
              title="Đổi ảnh đại diện"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => void handleFileSelect(e)}
            />
          </div>

          <h2 className="profile-name">{user.name}</h2>
          <p className="profile-email">{user.gmail}</p>

          <div className="profile-badges">
            <span className="profile-role-tag">{roleLabels[user.role]}</span>
            <Badge status={user.status || "Active"} />
          </div>

          <div className="profile-upload-hint">
            <button
              className="button secondary full-width"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera size={16} />
              {uploading ? "Đang tải ảnh lên…" : "Thay đổi ảnh đại diện"}
            </button>
            <small className="muted text-center block mt-2">
              Hỗ trợ PNG, JPG, WEBP tối đa 5MB
            </small>
          </div>
        </section>

        {/* Right Card: Full Details */}
        <section className="panel profile-details">
          <div className="panel-heading">
            <h2>Chi tiết thông tin</h2>
            <UserIcon size={20} color="#28704c" />
          </div>

          <div className="profile-info-grid">
            <div className="info-item">
              <span className="info-label">
                <UserIcon size={16} /> Họ và tên
              </span>
              <span className="info-value"><strong>{user.name}</strong></span>
            </div>

            <div className="info-item">
              <span className="info-label">
                <Mail size={16} /> Địa chỉ Gmail
              </span>
              <span className="info-value">{user.gmail}</span>
            </div>

            <div className="info-item">
              <span className="info-label">
                <Shield size={16} /> Vai trò hệ thống
              </span>
              <span className="info-value">
                <span className="role-chip">{roleLabels[user.role]}</span>
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">
                <Phone size={16} /> Số điện thoại
              </span>
              <span className="info-value">
                {user.phoneNumber || <span className="muted">Chưa cập nhật</span>}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">
                <Calendar size={16} /> Giới tính
              </span>
              <span className="info-value">
                {user.gender === "Male"
                  ? "Nam"
                  : user.gender === "Female"
                  ? "Nữ"
                  : user.gender || <span className="muted">Chưa chỉ định</span>}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">
                <StoreIcon size={16} /> Cửa hàng trực thuộc
              </span>
              <span className="info-value">
                {currentStore ? (
                  <strong>{currentStore.storeName}</strong>
                ) : user.idStore ? (
                  <small className="muted">{user.idStore}</small>
                ) : (
                  <span className="muted">Toàn hệ thống (Không cố định)</span>
                )}
              </span>
            </div>

            <div className="info-item full-width">
              <span className="info-label">
                <MapPin size={16} /> Địa chỉ liên hệ
              </span>
              <span className="info-value">
                {user.address || <span className="muted">Chưa cập nhật địa chỉ</span>}
              </span>
            </div>
          </div>

          <div className="profile-footer-note">
            <p>
              💡 <em>Lưu ý:</em> Để thay đổi số điện thoại, địa chỉ hoặc vai trò cửa hàng, vui lòng liên hệ <strong>Quản trị viên hệ thống (ADMIN)</strong>.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
