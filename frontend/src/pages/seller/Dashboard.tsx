import React, { useEffect, useState } from "react";
import { sellerApi, orderApi } from "@/lib/api";
import type { SellerStats, Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, ShoppingCart, DollarSign, Star, TrendingUp,
  Clock, CheckCircle2, Truck, ArrowUpRight, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
];

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda", confirmed: "Tasdiqlangan", processing: "Tayyorlanmoqda",
  shipped: "Jo'natildi", delivered: "Topshirildi", cancelled: "Bekor qilindi",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock, confirmed: CheckCircle2, processing: Package,
  shipped: Truck, delivered: CheckCircle2, cancelled: AlertCircle,
};

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          sellerApi.myStats(),
          orderApi.list(),
        ]);
        setStats(statsRes.data);
        setOrders(ordersRes.data?.results || ordersRes.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  // Status distribution
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status_choices] = (acc[o.status_choices] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: statusLabels[name] || name,
    value,
  }));

  // Monthly revenue
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("uz", { month: "short" });
      months[key] = 0;
    }
    orders.forEach(o => {
      if (o.status_choices !== "cancelled") {
        const d = new Date(o.created_at);
        const key = d.toLocaleDateString("uz", { month: "short" });
        if (key in months) months[key] += Number(o.payable_amount || 0);
      }
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  })();

  // Recent orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Pending orders needing attention
  const pendingOrders = orders.filter(o => o.status_choices === "pending").length;
  const processingOrders = orders.filter(o => o.status_choices === "processing").length;

  const statCards = [
    { label: "Mahsulotlar", value: stats?.product_count || 0, icon: Package, color: "text-primary" },
    { label: "Buyurtmalar", value: stats?.orders_count || 0, icon: ShoppingCart, color: "text-green-500" },
    { label: "Daromad", value: `${Number(stats?.revenue || 0).toLocaleString()} so'm`, icon: DollarSign, color: "text-yellow-500" },
    { label: "Reyting", value: stats?.avg_rating?.toFixed(1) || "0", icon: Star, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Seller Dashboard</h1>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {new Date().toLocaleDateString("uz")}
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map(c => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 p-3 md:p-4 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 md:h-5 md:w-5 ${c.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
              <div className="text-lg md:text-3xl font-bold">{loading ? "..." : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {(pendingOrders > 0 || processingOrders > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendingOrders > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Kutilayotgan buyurtmalar</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-yellow-600">{pendingOrders}</span>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/seller/orders")}>
                    Ko'rish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {processingOrders > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Tayyorlanayotgan</p>
                    <p className="text-xs text-muted-foreground">Jo'natish kerak</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{processingOrders}</span>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/seller/orders")}>
                    Ko'rish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Oylik savdo</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Yuklanmoqda...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()} so'm`, "Savdo"]}
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
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/seller/orders")}>
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
                {recentOrders.map(o => {
                  const StatusIcon = statusIcons[o.status_choices] || Clock;
                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => navigate("/seller/orders")}>
                      <td className="py-2 font-mono text-xs">#{o.id}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusLabels[o.status_choices] || o.status_choices}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant={o.payment_status === "paid" ? "default" : "outline"} className="text-[10px]">
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
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;
