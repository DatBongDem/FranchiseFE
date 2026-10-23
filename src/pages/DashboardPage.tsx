import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChefHat,
  Clock3,
  Leaf,
  Package,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useResource } from "../hooks/useResource";
import { operationsService } from "../services/operationsService";
import { productService } from "../services/productService";
import { Badge, date, Feedback, money, PageTitle } from "../components/ui";
import type { Role } from "../types/user";
const content: Record<
  Role,
  {
    title: string;
    description: string;
    focus: string;
    route: string;
    cta: string;
  }
> = {
  ADMIN: {
    title: "Bức tranh vận hành hôm nay",
    description: "Nắm bắt hoạt động toàn hệ thống và kết nối đội ngũ của bạn.",
    focus: "Mọi kết nối tốt, bắt đầu từ một góc nhìn rõ ràng.",
    route: "/users",
    cta: "Quản lý đội ngũ",
  },
  MANAGER: {
    title: "Cửa hàng trong tầm tay",
    description: "Theo dõi đơn hàng và hoạt động của cửa hàng mỗi ngày.",
    focus: "Mỗi đơn hàng chỉn chu. Mỗi khách hàng hài lòng.",
    route: "/orders",
    cta: "Theo dõi đơn hàng",
  },
  STORESTAFF: {
    title: "Sẵn sàng cho một ngày mới",
    description:
      "Tra cứu sản phẩm và cập nhật hành trình đơn hàng của cửa hàng.",
    focus: "Từng trải nghiệm nhỏ, tạo nên khác biệt lớn.",
    route: "/bills",
    cta: "Bán hàng / Tạo hóa đơn",
  },
  KITCHENSTAFF: {
    title: "Nhịp bếp hôm nay",
    description: "Nắm bắt hàng đợi và theo dõi các đơn đang được chế biến.",
    focus: "Nấu bằng sự tận tâm. Gửi đi những điều tươi mới.",
    route: "/kitchen",
    cta: "Vào bếp trung tâm",
  },
  SUPPLYCOORDINATOR: {
    title: "Mọi hành trình đều kết nối",
    description: "Điều phối đơn hàng giữa các cửa hàng và bếp trung tâm.",
    focus: "Đúng thời điểm. Đúng hành trình. Trọn chất lượng.",
    route: "/delivery",
    cta: "Điều phối đơn hàng",
  },
};
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user!.role;
  const copy = content[role];
  const resource = useResource(async () => {
    const [orders, products] = await Promise.all([
      operationsService.orders(role, user?.idStore),
      ["ADMIN", "MANAGER", "STORESTAFF"].includes(role)
        ? productService.list()
        : Promise.resolve([]),
    ]);
    return {
      orders: orders.filter(
        (o) =>
          !(user?.idStore && ["MANAGER", "STORESTAFF"].includes(role)) ||
          o.storeId?.toLowerCase() === user.idStore.toLowerCase(),
      ),
      products,
    };
  }, [role, user?.idStore]);
  const orders = resource.data?.orders || [];
  const statuses = [
    "Pending",
    "WaitingForCooking",
    "Cooking",
    "TakenFrom",
    "Completed",
  ];
  const total = orders.length;
  const stats = [
    {
      label:
        role === "KITCHENSTAFF"
          ? "Đơn trong bếp"
          : role === "SUPPLYCOORDINATOR"
            ? "Đơn cần điều phối"
            : "Tổng đơn hàng",
      value: total,
      icon: Package,
      tone: "orange",
      foot: "Trong phạm vi tài khoản",
    },
    {
      label: "Đang xử lý",
      value: orders.filter(
        (o) => !["Creating", "Completed", "Canceled"].includes(o.status),
      ).length,
      icon: Clock3,
      tone: "yellow",
      foot: "Đơn chưa hoàn thành",
    },
    {
      label: role === "KITCHENSTAFF" ? "Sẵn sàng giao" : "Đã hoàn thành",
      value: orders.filter(
        (o) => o.status === (role === "KITCHENSTAFF" ? "Cooked" : "Completed"),
      ).length,
      icon: role === "KITCHENSTAFF" ? ChefHat : Truck,
      tone: "green",
      foot: "Theo trạng thái hiện tại",
    },
    {
      label: ["KITCHENSTAFF", "SUPPLYCOORDINATOR"].includes(role)
        ? "Đơn chờ tiếp nhận"
        : "Sản phẩm",
      value: ["KITCHENSTAFF", "SUPPLYCOORDINATOR"].includes(role)
        ? orders.filter((o) =>
            ["Pending", "WaitingForCooking"].includes(o.status),
          ).length
        : resource.data?.products.length || 0,
      icon: ShoppingBag,
      tone: "pink",
      foot: ["KITCHENSTAFF", "SUPPLYCOORDINATOR"].includes(role)
        ? "Sẵn sàng cho bước tiếp theo"
        : "Trong danh mục hệ thống",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow={`XIN CHÀO, ${user?.name?.toLocaleUpperCase("vi")} 👋`}
        title={copy.title}
        description={copy.description}
      >
        <span className="live-pill">
          <i className="online-dot" /> Dữ liệu từ hệ thống
        </span>
      </PageTitle>
      <section className="dashboard-hero">
        <div>
          <span className="hero-tag">
            <Leaf size={14} /> FRESH START, BETTER DAY
          </span>
          <h2>{copy.focus}</h2>
          <Link className="hero-link" to={copy.route}>
            {copy.cta}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="hero-art">
          <div className="art-circle" />
          <Leaf size={112} strokeWidth={1} />
          <span className="art-chip">
            <i className="online-dot" /> Cùng nhau phát triển
          </span>
          <span className="art-star">✳</span>
        </div>
      </section>
      <Feedback
        loading={resource.loading}
        error={resource.error}
        retry={resource.reload}
      />
      {!resource.loading && !resource.error && (
        <>
          <div className="stats-grid">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <div>
                  <span>{stat.label}</span>
                  <span className={`stat-icon ${stat.tone}`}>
                    <stat.icon size={20} />
                  </span>
                </div>
                <strong>{stat.value.toLocaleString("vi-VN")}</strong>
                <small>
                  <ArrowDownRight size={14} />
                  {stat.foot}
                </small>
              </article>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel activity-panel">
              <div className="panel-heading">
                <div>
                  <h2>Nhịp độ đơn hàng</h2>
                  <p>Phân bổ theo trạng thái hiện tại</p>
                </div>
                <span className="chart-mark">LIVE OVERVIEW</span>
              </div>
              <div className="status-chart">
                {statuses.map((status) => {
                  const count = orders.filter(
                    (o) => o.status === status,
                  ).length;
                  const labels: Record<string, string> = {
                    Pending: "Chờ xử lý",
                    WaitingForCooking: "Chờ nấu",
                    Cooking: "Đang nấu",
                    TakenFrom: "Đang giao",
                    Completed: "Hoàn thành",
                  };
                  return (
                    <div className="chart-column" key={status}>
                      <strong>{count}</strong>
                      <div className="bar-track">
                        <div
                          className={`bar bar-${status}`}
                          style={{
                            height: `${total ? Math.max((count / Math.max(...statuses.map((s) => orders.filter((o) => o.status === s).length), 1)) * 100, 2) : 2}%`,
                          }}
                        />
                      </div>
                      <span>{labels[status]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="chart-note">
                <i className="online-dot" /> Tổng hợp từ {total} đơn hàng được
                tải về{" "}
                <button
                  className="text-button"
                  onClick={() => void resource.reload()}
                >
                  Làm mới ↗
                </button>
              </div>
            </section>
            <section className="panel quick-panel">
              <div className="panel-heading">
                <h2>Truy cập nhanh</h2>
                <ArrowUpRight size={20} />
              </div>
              {[
                {
                  to: copy.route,
                  icon:
                    role === "KITCHENSTAFF"
                      ? ChefHat
                      : role === "SUPPLYCOORDINATOR"
                        ? Truck
                        : Package,
                  title: copy.cta,
                  desc: "Tiếp tục công việc hôm nay",
                },
                ...(["ADMIN", "MANAGER", "STORESTAFF"].includes(role)
                  ? [
                      {
                        to: "/products",
                        icon: ShoppingBag,
                        title: "Danh mục sản phẩm",
                        desc: "Thông tin và giá bán mới nhất",
                      },
                    ]
                  : [
                      {
                        to:
                          role === "KITCHENSTAFF"
                            ? "/ingredients"
                            : "/delivery",
                        icon: Leaf,
                        title:
                          role === "KITCHENSTAFF"
                            ? "Tra cứu nguyên liệu"
                            : "Theo dõi vận chuyển",
                        desc: "Kết nối chuỗi vận hành",
                      },
                    ]),
                ...(role === "ADMIN" || role === "MANAGER"
                  ? [
                      {
                        to: "/users",
                        icon: Users,
                        title: "Đội ngũ của bạn",
                        desc: "Tài khoản và vai trò",
                      },
                    ]
                  : []),
              ].map((item, index) => (
                <Link key={index} to={item.to} className="quick-link">
                  <span>
                    <item.icon size={21} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
              <div className="daily-note">
                <span>GÓC NHỎ MỖI NGÀY</span>
                <p>
                  “Chất lượng là tổng hòa của những điều nhỏ được làm thật tốt.”
                </p>
                <Leaf size={25} />
              </div>
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Đơn hàng gần đây</h2>
                <p>Các đơn có thời gian gửi mới nhất</p>
              </div>
              <Link
                className="text-button"
                to={
                  role === "KITCHENSTAFF"
                    ? "/kitchen"
                    : role === "SUPPLYCOORDINATOR"
                      ? "/delivery"
                      : "/orders"
                }
              >
                Xem tất cả <ArrowRight size={15} />
              </Link>
            </div>
            {!orders.length ? (
              <Feedback empty />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>MÃ ĐƠN HÀNG</th>
                      <th>THỜI GIAN GỬI</th>
                      <th>TRẠNG THÁI</th>
                      <th>GIÁ TRỊ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...orders]
                      .sort(
                        (a, b) =>
                          (Date.parse(b.sentTime || "") || 0) -
                          (Date.parse(a.sentTime || "") || 0),
                      )
                      .slice(0, 5)
                      .map((o) => (
                        <tr key={o.orderId}>
                          <td>
                            <strong>
                              #{o.orderId.slice(0, 8).toUpperCase()}
                            </strong>
                          </td>
                          <td>{date(o.sentTime)}</td>
                          <td>
                            <Badge status={o.status} />
                          </td>
                          <td className="amount">{money(o.totalAmount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
