import { Menu, CalendarDays, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { roleLabels } from "../types/user";
import { Link, useLocation } from "react-router-dom";
import { navigation } from "./Sidebar";
export default function Header({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const location = useLocation();

  const currentLabel =
    location.pathname === "/orders/new"
      ? "Tạo đơn hàng"
      : location.pathname === "/profile"
      ? "Hồ sơ cá nhân"
      : navigation.find((item) => item.path === location.pathname)?.label ||
        "Tổng quan";

  return (
    <header className="header">
      <div className="breadcrumb">
        <button
          className="icon-button menu-button"
          onClick={onMenu}
          aria-label="Mở menu"
        >
          <Menu />
        </button>
        <span>Workspace</span>
        <span>/</span>
        <strong>{currentLabel}</strong>
      </div>
      <div className="header-right">
        <span className="today">
          <CalendarDays size={16} />
          {new Date().toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
        <span className="header-divider" />
        <Link to="/profile" className="header-profile-link" title="Xem hồ sơ cá nhân">
          <div className="avatar header-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="avatar-img" />
            ) : (
              user?.name?.charAt(0).toUpperCase() || "F"
            )}
          </div>
          <div className="user-info">
            <b>{user?.name}</b>
            <small>{user ? roleLabels[user.role] : ""}</small>
          </div>
          <ChevronDown size={15} />
        </Link>
      </div>
    </header>
  );
}
