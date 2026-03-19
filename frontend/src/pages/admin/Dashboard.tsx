import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminApi, billingApi } from "@/lib/api";
import type { Order, Payment } from "@/types";
import {
  Users, ShoppingCart, Package, Store, TrendingUp, DollarSign,
  Clock, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda", confirmed: "Tasdiqlangan", processing: "Tayyorlanmoqda",
  shipped: "Jo'natildi", delivered: "Topshirildi", cancelled: "Bekor qilindi",
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, orders: 0, products: 0, sellers: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, ordersRes, productsRes, sellersRes] = await Promise.all([
          adminApi.users.active(),
          adminApi.orders.list(),
          adminApi.products.list(),
          adminApi.sellers.list(),
        ]);
        const orderList = ordersRes.data?.results || ordersRes.data || [];
        setStats({
          users: usersRes.data?.length || usersRes.data?.results?.length || 0,
          orders: orderList.length,
          products: productsRes.data?.length || productsRes.data?.results?.length || 0,
          sellers: sellersRes.data?.length || sellersRes.data?.results?.length || 0,
        });
        setOrders(orderList);
      } catch {}

      try {
        const payRes = await billingApi.list();
        setPayments(payRes.data?.results || payRes.data || []);
      } catch {}

      setLoading(false);
    };
    load();
  }, []);

  // Revenue calc
  const totalRevenue = orders.reduce((s, o) => s + Number(o.payable_amount || 0), 0);
  const paidRevenue = payments
    .filter(p => p.status === "succeeded")
    .reduce((s, p) => s + Number(p.amount), 0);

  // Order status distribution for pie chart
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status_choices] = (acc[o.status_choices] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: statusLabels[name] || name,
    value,
  }));

  // Recent orders (last 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Monthly revenue bar chart (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("uz", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const key = d.toLocaleDateString("uz", { month: "short", year: "2-digit" });
      if (key in months) months[key] += Number(o.payable_amount || 0);
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  })();

  const summaryCards = [
    { label: "Foydalanuvchilar", value: stats.users, icon: Users, color: "text-primary", path: "/admin/users" },
    { label: "Buyurtmalar", value: stats.orders, icon: ShoppingCart, color: "text-green-500", path: "/admin/orders" },
    { label: "Mahsulotlar", value: stats.products, icon: Package, color: "text-orange-500", path: "/admin/products" },
    { label: "Sellerlar", value: stats.sellers, icon: Store, color: "text-purple-500", path: "/admin/sellers" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {new Date().toLocaleDateString("uz")}
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaryCards.map(c => (
          <Card
            key={c.label}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(c.path)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-4 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 md:h-5 md:w-5 ${c.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="text-xl md:text-3xl font-bold">{loading ? "..." : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Umumiy buyurtma summasi</p>
              <p className="text-xl md:text-2xl font-bold">{loading ? "..." : `${totalRevenue.toLocaleString()} so'm`}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stripe orqali to'langan</p>
              <p className="text-xl md:text-2xl font-bold">{loading ? "..." : `${paidRevenue.toLocaleString()} so'm`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Oylik daromad</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Yuklanmoqda...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} so'm`, "Daromad"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Buyurtma holatlari</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading || pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {loading ? "Yuklanmoqda..." : "Ma'lumot yo'q"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
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
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/admin/orders")}>
            Barchasini ko'rish <ArrowUpRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Buyurtma yo'q</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 font-medium">ID</th>
                  <th className="text-left py-2 font-medium">Holat</th>
                  <th className="text-left py-2 font-medium">To'lov</th>
                  <th className="text-right py-2 font-medium">Summa</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">Sana</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr
                    key={o.id}
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate("/admin/orders")}
                  >
                    <td className="py-2 font-mono text-xs">#{o.id}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {statusLabels[o.status_choices] || o.status_choices}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <Badge
                        variant={o.payment_status === "paid" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {o.payment_status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-mono text-xs">
                      {Number(o.payable_amount).toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-xs text-muted-foreground hidden sm:table-cell">
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
