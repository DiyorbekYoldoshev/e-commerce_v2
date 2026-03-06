import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  User,
  LogOut,
  ChevronRight,
  Store,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/seller" },
  { label: "Mahsulotlarim", icon: Package, path: "/seller/products" },
  { label: "Buyurtmalarim", icon: ShoppingCart, path: "/seller/orders" },
  { label: "Profilim", icon: User, path: "/seller/profile" },
];

const SellerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Overlay for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-30 transform transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between lg:justify-start">
          <h1 className="text-lg font-bold text-sidebar-primary-foreground flex items-center gap-2">
            <Store className="h-5 w-5 text-sidebar-primary" /> Seller Panel
          </h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-sidebar-primary-foreground" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/seller" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {active && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">{user?.email}</div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64 overflow-auto">
        {/* Top bar for mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-sidebar-border bg-background">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-md hover:bg-gray-200">
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-lg font-semibold">Seller Panel</div>
          <div></div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;