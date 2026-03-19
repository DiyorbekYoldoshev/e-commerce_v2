import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, Heart, User, Search, LogOut, Package,
  Menu, X, Store, ChevronDown, CreditCard,
} from "lucide-react";

const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <Store className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold hidden sm:block">E-Commerce</span>
            </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mahsulotlarni qidirish..."
                  className="pl-9 bg-secondary/50"
                />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/wishlist")} className="relative">
                <Heart className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => navigate("/cart")} className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <User className="h-4 w-4" />
                      <span className="hidden md:inline">{user.first_name || "Profil"}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="h-4 w-4 mr-2" /> Profilim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-orders")}>
                      <Package className="h-4 w-4 mr-2" /> Buyurtmalarim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/payments")}>
                      <CreditCard className="h-4 w-4 mr-2" /> To'lovlarim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wishlist")}>
                      <Heart className="h-4 w-4 mr-2" /> Sevimlilar
                    </DropdownMenuItem>
                    {user.is_staff && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          Admin panel
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.is_seller && (
                      <DropdownMenuItem onClick={() => navigate("/seller")}>
                        Seller panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Chiqish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                    Kirish
                  </Button>
                  <Button size="sm" onClick={() => navigate("/register")}>
                    Ro'yxatdan o'tish
                  </Button>
                </div>
              )}

              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
                {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenu && (
            <nav className="md:hidden border-t py-3 flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileMenu(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">Bosh sahifa</Link>
              <Link to="/products" onClick={() => setMobileMenu(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">Mahsulotlar</Link>
            </nav>
          )}
        </div>
      </header>

      {/* Nav */}
      <nav className="border-b bg-card/50 hidden md:block">
        <div className="container mx-auto px-4 flex gap-6 h-10 items-center text-sm">
          <Link to="/" className={`hover:text-primary transition-colors ${location.pathname === "/" ? "text-primary font-medium" : "text-muted-foreground"}`}>
            Bosh sahifa
          </Link>
          <Link to="/products" className={`hover:text-primary transition-colors ${location.pathname.startsWith("/products") ? "text-primary font-medium" : "text-muted-foreground"}`}>
            Mahsulotlar
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Store className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">E-Commerce</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sifatli mahsulotlar, ishonchli xarid.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Havolalar</h4>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <Link to="/products" className="hover:text-primary">Mahsulotlar</Link>
                <Link to="/my-orders" className="hover:text-primary">Buyurtmalarim</Link>
                <Link to="/wishlist" className="hover:text-primary">Sevimlilar</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Aloqa</h4>
              <p className="text-sm text-muted-foreground">
                Email: info@e-commerce.uz<br />
                Tel: +998 90 123 45 67
              </p>
            </div>
          </div>
          <div className="border-t mt-6 pt-4 text-center text-xs text-muted-foreground">
            © 2024 E-Commerce. Barcha huquqlar himoyalangan.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;
