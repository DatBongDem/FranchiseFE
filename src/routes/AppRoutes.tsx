import { useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar, { allowed } from "../components/Sidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Feedback } from "../components/ui";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProductPage from "../pages/ProductPage";
import OrdersPage from "../pages/OrdersPage";
import IngredientsPage from "../pages/IngredientsPage";
import UsersPage from "../pages/UsersPage";
import CreateOrderPage from "../pages/CreateOrderPage";
import CreateBillPage from "../pages/CreateBillPage";
import RevenuePage from "../pages/RevenuePage";
import ShrinkagePage from "../pages/ShrinkagePage";
import StoreBillHistoryPage from "../pages/StoreBillHistoryPage";
import RecipesPage from "../pages/RecipesPage";
function Layout() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  if (loading) return <Feedback loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed(location.pathname, user.role))
    return <Navigate to="/dashboard" replace />;
  return (
    <div className="app-layout">
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-shell">
        <Header onMenu={() => setOpen(true)} />
        <main id="main" key={location.pathname}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
export default function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <Feedback loading />;
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<CreateOrderPage />} />
        <Route path="/bills" element={<CreateBillPage />} />
        <Route path="/revenue" element={<RevenuePage />} />
        <Route path="/shrinkage" element={<ShrinkagePage />} />
        <Route path="/store-bills" element={<StoreBillHistoryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/kitchen" element={<OrdersPage />} />
        <Route path="/delivery" element={<OrdersPage />} />
        <Route path="/ingredients" element={<IngredientsPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
