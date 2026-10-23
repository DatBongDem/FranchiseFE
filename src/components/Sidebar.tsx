import { NavLink } from "react-router-dom";
import {
  ArrowUpRight,
  ChefHat,
  LayoutDashboard,
  Leaf,
  LogOut,
  Package,
  ReceiptText,
  BarChart3,
  BookOpen,
  History,
  PackageX,
  ShoppingBag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { roleLabels, type Role } from "../types/user";
export const navigation = [
  {
    path: "/ingredient-history",
    label: "Lịch sử nguyên liệu",
    icon: History,
    roles: ["KITCHENSTAFF"],
  },
  {
    path: "/recipes",
    label: "Công thức",
    icon: BookOpen,
    roles: ["ADMIN", "KITCHENSTAFF"],
  },
  {
    path: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    roles: [
      "ADMIN",
      "MANAGER",
      "STORESTAFF",
      "KITCHENSTAFF",
      "SUPPLYCOORDINATOR",
    ],
  },
  {
    path: "/products",
    label: "Sản phẩm",
    icon: ShoppingBag,
    roles: ["ADMIN", "MANAGER", "STORESTAFF"],
  },
  {
    path: "/orders",
    label: "Đơn hàng",
    icon: Package,
    roles: ["ADMIN", "MANAGER", "STORESTAFF"],
  },
  {
    path: "/bills",
    label: "Bán hàng / Hóa đơn",
    icon: ReceiptText,
    roles: ["STORESTAFF"],
  },
  {
    path: "/revenue",
    label: "Doanh thu cửa hàng",
    icon: BarChart3,
    roles: ["MANAGER"],
  },
  {
    path: "/store-bills",
    label: "Lịch sử hóa đơn",
    icon: ReceiptText,
    roles: ["MANAGER"],
  },
  {
    path: "/store-orders",
    label: "Lịch sử đơn hàng",
    icon: Package,
    roles: ["MANAGER"],
  },
  {
    path: "/shrinkage",
    label: "Hao hụt cửa hàng",
    icon: PackageX,
    roles: ["MANAGER"],
  },
  {
    path: "/kitchen",
    label: "Bếp trung tâm",
    icon: ChefHat,
    roles: ["KITCHENSTAFF"],
  },
  {
    path: "/delivery",
    label: "Điều phối đơn",
    icon: Truck,
    roles: ["SUPPLYCOORDINATOR"],
  },
  {
    path: "/ingredients",
    label: "Nguyên liệu",
    icon: Leaf,
    roles: ["ADMIN", "KITCHENSTAFF"],
  },
  {
    path: "/users",
    label: "Tài khoản",
    icon: Users,
    roles: ["ADMIN", "MANAGER"],
  },
];
export function allowed(path: string, role: Role) {
  if (path === "/orders/new") return role === "STORESTAFF";
  return (
    navigation.find((item) => item.path === path)?.roles.includes(role) ?? false
  );
}
export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  return (
    <>
      <button
        className={`sidebar-overlay ${open ? "visible" : ""}`}
        aria-label="Đóng menu"
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <NavLink to="/dashboard" className="brand">
          <span className="brand-mark">
            f<span>•</span>
          </span>
          <span>
            franchise<b>WORKSPACE</b>
          </span>
        </NavLink>
        <button
          className="mobile-close icon-button"
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <X />
        </button>
        <div className="workspace">
          <span className="workspace-icon">
            <Leaf size={20} />
          </span>
          <div>
            <strong>Không gian vận hành</strong>
            <small>{roleLabels[user!.role]}</small>
          </div>
          <span className="online-dot" />
        </div>
        <div className="nav-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav>
          {navigation
            .filter((item) => item.roles.includes(user!.role))
            .map((item) => (
              <NavLink to={item.path} key={item.path} onClick={onClose}>
                <item.icon size={20} />
                <span>{item.label}</span>
                <ArrowUpRight size={15} className="nav-arrow" />
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Leaf size={23} />
            <strong>Tươi mới mỗi ngày.</strong>
            <p>Kết nối cửa hàng, căn bếp và những trải nghiệm tốt hơn.</p>
            <span>GROW TOGETHER ↗</span>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={18} /> Đăng xuất
          </button>
          <small>FRANCHISE OPERATIONS © {new Date().getFullYear()}</small>
        </div>
      </aside>
    </>
  );
}
