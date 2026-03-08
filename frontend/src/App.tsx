import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Layouts
import AdminLayout from "@/components/layouts/AdminLayout";
import SellerLayout from "@/components/layouts/SellerLayout";
import CustomerLayout from "@/components/layouts/CustomerLayout";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";

// Customer pages
import Home from "@/pages/customer/Home";
import ProductList from "@/pages/customer/ProductList";
import ProductDetail from "@/pages/customer/ProductDetail";
import Cart from "@/pages/customer/Cart";
import Checkout from "@/pages/customer/Checkout";
import CustomerWishlist from "@/pages/customer/Wishlist";
import MyOrders from "@/pages/customer/MyOrders";
import CustomerProfile from "@/pages/customer/Profile";

// Admin pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminOrders from "@/pages/admin/Orders";
import AdminProducts from "@/pages/admin/Products";
import AdminCategories from "@/pages/admin/Categories";
import AdminSellers from "@/pages/admin/Sellers";
import AdminSellerRequests from "@/pages/admin/SellerRequests";

// Seller pages
import SellerDashboard from "@/pages/seller/Dashboard";
import SellerProducts from "@/pages/seller/Products";
import SellerOrders from "@/pages/seller/Orders";
import SellerProfile from "@/pages/seller/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Customer */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/wishlist" element={<CustomerWishlist />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/profile" element={<CustomerProfile />} />
              </Route>

              {/* Admin Panel */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="sellers" element={<AdminSellers />} />
                <Route path="seller-requests" element={<AdminSellerRequests />} />
              </Route>

              {/* Seller Panel */}
              <Route
                path="/seller"
                element={
                  <ProtectedRoute requireSeller>
                    <SellerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SellerDashboard />} />
                <Route path="products" element={<SellerProducts />} />
                <Route path="orders" element={<SellerOrders />} />
                <Route path="profile" element={<SellerProfile />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
