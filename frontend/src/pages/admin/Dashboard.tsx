import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/lib/api";
import { Users, ShoppingCart, Package, Store } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

// ---- types (minimal) ----
type OrderItem = {
  product?: number;
  product_id?: number;
  product_name?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  total_price?: number;
  price?: number;
};

type Order = {
  id: number;
  created_at?: string;
  created?: string;
  createdAt?: string;
  items?: OrderItem[];
  order_items?: OrderItem[];
  lines?: OrderItem[];
};

type Product = {
  id: number;
  name: string;
};

function parseDate(d?: string) {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function dayKey(dt: Date) {
  // YYYY-MM-DD
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function lastNDaysKeys(n: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, orders: 0, products: 0, sellers: 0 });
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, ordersRes, productsRes, sellersRes] = await Promise.all([
          adminApi.users.active(),
          adminApi.orders.list(),
          adminApi.products.list(),
          adminApi.sellers.list(),
        ]);

        const usersCount = usersRes.data?.length || usersRes.data?.results?.length || 0;
        const ordersList: Order[] = ordersRes.data?.results ?? ordersRes.data ?? [];
        const productsList: Product[] = productsRes.data?.results ?? productsRes.data ?? [];
        const sellersCount = sellersRes.data?.length || sellersRes.data?.results?.length || 0;

        setStats({
          users: usersCount,
          orders: ordersList.length,
          products: productsList.length,
          sellers: sellersCount,
        });

        setOrders(ordersList);
        setProducts(productsList);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cards = [
    { label: "Foydalanuvchilar", value: stats.users, icon: Users, color: "text-blue-500" },
    { label: "Buyurtmalar", value: stats.orders, icon: ShoppingCart, color: "text-green-500" },
    { label: "Mahsulotlar", value: stats.products, icon: Package, color: "text-orange-500" },
    { label: "Sellerlar", value: stats.sellers, icon: Store, color: "text-purple-500" },
  ];

  // ---- compute weekly stats ----
  const { ordersByDay, topProducts } = useMemo(() => {
    // 7 kun
    const days = lastNDaysKeys(7);
    const ordersCountMap = new Map<string, number>();
    days.forEach((k) => ordersCountMap.set(k, 0));

    // product sales map
    const qtyMap = new Map<number, number>();
    const nameMap = new Map<number, string>();

    // quick product name map
    const productNameById = new Map<number, string>();
    products.forEach((p) => productNameById.set(p.id, p.name));

    for (const o of orders) {
      const dt =
        parseDate(o.created_at) ||
        parseDate(o.created) ||
        parseDate(o.createdAt);

      if (dt) {
        const k = dayKey(dt);
        if (ordersCountMap.has(k)) {
          ordersCountMap.set(k, (ordersCountMap.get(k) || 0) + 1);
        }
      }

      const items =
          (o as any).items ??
          (o as any).order_items ??
          (o as any).lines ??
          (o as any).orderItems ??
          (o as any).orderItems?.results ??
          (o as any).order_items?.results ??
          (o as any).orderitem_set ??
          (o as any).orderitem_set?.results ??
          (o as any).cart_items ??
          (o as any).cartItems ??
          [];
      for (const it of items) {
        const pid =
          (it as any).product_id ??
          (it as any).product ??
          (it as any).product?.id ??
          (it as any).variant?.product ??
          (it as any).variant?.product_id ??
          null;
        if (!pid) continue;

        const qty = it.quantity ?? it.qty ?? 0;
        qtyMap.set(pid, (qtyMap.get(pid) || 0) + qty);

        const nm =
          (it as any).product_name ||
          (it as any).name ||
          (it as any).product?.name ||
          productNameById.get(pid) ||
          `#${pid}`;
        nameMap.set(pid, nm);
      }
    }

    const ordersByDay = days.map((k) => ({
      day: k.slice(5), // MM-DD
      orders: ordersCountMap.get(k) || 0,
    }));

    const topProducts = [...qtyMap.entries()]
      .map(([productId, qty]) => ({
        productId,
        name: nameMap.get(productId) || `#${productId}`,
        qty,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);

    return { ordersByDay, topProducts };
  }, [orders, products]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "..." : c.value}</div>
              <div className="text-xs text-muted-foreground mt-1">
                So‘nggi 7 kunlik ko‘rinishda pastdagi grafiklar
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Haftalik buyurtmalar (7 kun)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="text-muted-foreground">Yuklanmoqda...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Haftalik eng ko‘p sotilgan mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="text-muted-foreground">Yuklanmoqda...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-muted-foreground">Hafta ichida sotuv topilmadi.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qty" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* table: top products */}
      <Card>
        <CardHeader>
          <CardTitle>Top mahsulotlar (7 kun)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Yuklanmoqda...</div>
          ) : topProducts.length === 0 ? (
            <div className="text-muted-foreground">Sotuv topilmadi.</div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div key={p.productId} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-sm text-muted-foreground">{idx + 1}</div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {p.productId}</div>
                  </div>
                  <div className="font-mono">{p.qty} ta</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;