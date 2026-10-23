import { Menu, CalendarDays, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { roleLabels } from "../types/user";
import { useLocation } from "react-router-dom";
import { navigation } from "./Sidebar";
export default function Header({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
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
        <strong>
          {navigation.find((item) => item.path === location.pathname)?.label ||
            "Tổng quan"}
        </strong>
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
        <div className="avatar">
          {user?.name?.charAt(0).toUpperCase() || "F"}
        </div>
        <div className="user-info">
          <b>{user?.name}</b>
          <small>{roleLabels[user!.role]}</small>
        </div>
        <ChevronDown size={15} />
      </div>
    </header>
  );
}
