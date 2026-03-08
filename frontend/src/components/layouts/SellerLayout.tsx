import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, ShoppingCart, User,
  LogOut, ChevronRight, Store, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

  const sidebar = (
    <>
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
        <h1 className="text-lg font-bold text-sidebar-primary-foreground flex items-center gap-2">
          <Store className="h-5 w-5 text-sidebar-primary" />
          Seller Panel
        </h1>
        <Button
          variant="ghost" size="icon"
          className="lg:hidden text-sidebar-foreground hover:text-sidebar-primary-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path ||
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
          onClick={() => { logout(); navigate("/login"); }}
          className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Chiqish
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-sm">Seller Panel</span>
        </div>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SellerLayout;
