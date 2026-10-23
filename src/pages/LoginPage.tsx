import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
export default function LoginPage() {
  const { user, login } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await login(
        String(form.get("email")).trim(),
        String(form.get("password")),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand light">
          <span className="brand-mark">
            f<span>•</span>
          </span>
          <span>
            franchise<b>OPERATIONS PLATFORM</b>
          </span>
        </div>
        <div className="login-story-content">
          <div className="eyebrow">MỘT HỆ THỐNG. NHIỀU KẾT NỐI.</div>
          <h1>
            Vận hành trọn vẹn.
            <br />
            <em>Tươi mới mỗi ngày.</em>
          </h1>
          <p>
            Từ căn bếp đến từng cửa hàng, mọi hành trình đều bắt đầu từ sự kết
            nối.
          </p>
          <div className="orbital">
            <div className="orbit-ring" />
            <div className="orbit-center">
              <Sprout size={76} strokeWidth={1.2} />
            </div>
            <span className="orbit-tag tag-one">
              <Leaf size={17} /> Nguyên liệu tươi
            </span>
            <span className="orbit-tag tag-two">↗ Vận hành hiệu quả</span>
            <span className="orbit-tag tag-three">● Kết nối cửa hàng</span>
          </div>
        </div>
        <small>ĐƯỢC THIẾT KẾ CHO NHỮNG ĐIỀU TỐT HƠN.</small>
      </section>
      <section className="login-form-area">
        <span className="login-top">
          <ShieldCheck size={16} /> Không gian làm việc nội bộ
        </span>
        <div className="login-form-wrap">
          <span className="welcome-icon">✳</span>
          <div className="eyebrow">CHÀO MỪNG TRỞ LẠI</div>
          <h2>Bắt đầu ngày mới.</h2>
          <p>Đăng nhập để tiếp tục công việc của bạn.</p>
          <form onSubmit={submit}>
            <label>
              Email công việc
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="ban@franchise.vn"
                required
                maxLength={254}
              />
            </label>
            <label>
              Mật khẩu
              <div className="password-field">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu của bạn"
                  required
                />
                <button
                  type="button"
                  aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </label>
            {error && (
              <div role="alert" className="inline-error">
                {error}
              </div>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              <ArrowRight size={19} />
            </button>
          </form>
          <p className="login-help">
            Chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền truy cập.
          </p>
          <div className="login-security">
            <ShieldCheck size={16} /> Phiên làm việc được bảo vệ bằng xác thực
            tài khoản.
          </div>
        </div>
        <small>Franchise Workspace · Phiên bản 0.1</small>
      </section>
    </div>
  );
}
