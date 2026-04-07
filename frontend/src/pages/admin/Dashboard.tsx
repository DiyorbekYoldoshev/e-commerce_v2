import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, productApi, billingApi } from "@/lib/api";
import type { Order, Payment } from "@/types";
import {
  Users, ShoppingCart, Package, Store, TrendingUp, DollarSign,
  Clock, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

const STATUS_LABELS: Record<string, string> = {
  pending:    "Kutilmoqda",
  confirmed:  "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped:    "Jo'natildi",
  delivered:  "Topshirildi",
  cancelled:  "Bekor qilindi",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid:    "To'langan",
  unpaid:  "To'lanmagan",
  pending: "Kutilmoqda",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList<T>(res: any): T[] {
  return res?.data?.results ?? res?.data ?? [];
}

function extractCount(res: any): number {
  const list = extractList(res);
  return Array.isArray(list) ? list.length : (res?.data?.count ?? 0);
}

function formatSum(value: number): string {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading: boolean;
  path: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, bgColor, loading, path }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
      onClick={() => navigate(path)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-4 md:pb-2">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
        <div className="text-2xl md:text-3xl font-bold">
          {loading ? <span className="animate-pulse text-muted-foreground">—</span> : value}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ users: 0, orders: 0, products: 0, sellers: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    // ── Core stats ──────────────────────────────────────────────────────────
    try {
      const [usersRes, ordersRes, productsRes, sellersRes] = await Promise.all([
        adminApi.users.active(),
        adminApi.orders.list(),
        productApi.list(),
        adminApi.users.sellers(), // adminApi.sellers mavjud emas — users.sellers() ishlatiladi
      ]);

      const orderList: Order[] = extractList(ordersRes);

      setStats({
        users:    extractCount(usersRes),
        orders:   orderList.length,
        products: extractCount(productsRes),
        sellers:  extractCount(sellersRes),
      });

      setOrders(orderList);
    } catch (err) {
      console.error("Dashboard stats xatosi:", err);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    }

    // ── Payments (alohida — xato bo'lsa stats ni bloklamas) ─────────────────
    try {
      const payRes = await billingApi.list();
      setPayments(extractList(payRes));
    } catch (err) {
      console.warn("To'lovlarni yuklashda xatolik:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const totalRevenue = orders.reduce((s, o) => s + Number(o.payable_amount || 0), 0);

  const paidRevenue = payments
    .filter((p) => p.status === "succeeded")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const key = o.status_choices;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name,
    value,
  }));

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("uz", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toLocaleDateString("uz", { month: "short", year: "2-digit" });
      if (key in months) months[key] += Number(o.payable_amount || 0);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  })();

  // ── Stat cards config ──────────────────────────────────────────────────────

  const summaryCards: StatCardProps[] = [
    {
      label: "Foydalanuvchilar", value: stats.users,    icon: Users,
      color: "text-blue-600",   bgColor: "bg-blue-100",   loading, path: "/admin/users",
    },
    {
      label: "Buyurtmalar",     value: stats.orders,   icon: ShoppingCart,
      color: "text-green-600",  bgColor: "bg-green-100",  loading, path: "/admin/orders",
    },
    {
      label: "Mahsulotlar",     value: stats.products, icon: Package,
      color: "text-orange-600", bgColor: "bg-orange-100", loading, path: "/admin/products",
    },
    {
      label: "Sellerlar",       value: stats.sellers,  icon: Store,
      color: "text-purple-600", bgColor: "bg-purple-100", loading, path: "/admin/sellers",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date().toLocaleDateString("uz")}
          </Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1 text-xs">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaryCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Umumiy buyurtma summasi</p>
              <p className="text-xl md:text-2xl font-bold truncate">
                {loading ? <span className="animate-pulse text-muted-foreground">—</span> : formatSum(totalRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Stripe orqali to'langan</p>
              <p className="text-xl md:text-2xl font-bold truncate">
                {loading ? <span className="animate-pulse text-muted-foreground">—</span> : formatSum(paidRevenue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Oylik daromad (so'm)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Yuklanmoqda...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatSum(value), "Daromad"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Buyurtma holatlari</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Yuklanmoqda...
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Ma'lumot yo'q
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={75}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">So'nggi buyurtmalar</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => navigate("/admin/orders")}
          >
            Barchasini ko'rish <ArrowUpRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 pb-2">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Yuklanmoqda...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Buyurtma yo'q</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 px-4 font-medium">ID</th>
                  <th className="text-left py-2 px-4 font-medium">Holat</th>
                  <th className="text-left py-2 px-4 font-medium">To'lov</th>
                  <th className="text-right py-2 px-4 font-medium">Summa</th>
                  <th className="text-right py-2 px-4 font-medium hidden sm:table-cell">Sana</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate("/admin/orders")}
                  >
                    <td className="py-2 px-4 font-mono text-xs text-muted-foreground">#{o.id}</td>
                    <td className="py-2 px-4">
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        {STATUS_LABELS[o.status_choices] || o.status_choices}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      <Badge
                        variant={o.payment_status === "paid" ? "default" : "secondary"}
                        className="text-[10px] whitespace-nowrap"
                      >
                        {PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs whitespace-nowrap">
                      {Number(o.payable_amount || 0).toLocaleString()} so'm
                    </td>
                    <td className="py-2 px-4 text-right text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString("uz")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;