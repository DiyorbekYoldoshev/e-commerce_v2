import React, { useEffect, useMemo, useState } from "react";
import { sellerApi } from "@/lib/api";
import type { SellerStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, Star, TrendingUp } from "lucide-react";
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

type OrderItem = {
  product?: number;
  product_id?: number;
  product_name?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  total_price?: number;
};

type Order = {
  id: number;
  created_at?: string;
  created?: string;
  createdAt?: string;
  total?: number;
  total_price?: number;
  items?: OrderItem[];
  order_items?: OrderItem[];
  lines?: OrderItem[];
};

type Product = { id: number; name: string; base_price?: string | number };

function parseDate(d?: string) {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
function dayKey(dt: Date) {
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

const SellerDashboard: React.FC = () => {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  // extra data (optional)
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [extraLoading, setExtraLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await sellerApi.myStats();
        setStats(res.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  // Optional: load orders/products for charts + top products
  useEffect(() => {
    const loadExtra = async () => {
      try {
        // bu endpointlar sizda bo‘lmasligi mumkin — bo‘lmasa catchga tushadi
        const [ordersRes, productsRes] = await Promise.all([
          (sellerApi as any).myOrders?.(),
          (sellerApi as any).myProducts?.(),
        ]);

        const ordersList: Order[] = ordersRes?.data?.results ?? ordersRes?.data ?? [];
        const productsList: Product[] = productsRes?.data?.results ?? productsRes?.data ?? [];
        setOrders(ordersList);
        setProducts(productsList);
      } catch {
        // ignore — stats baribir ishlaydi
      } finally {
        setExtraLoading(false);
      }
    };
    loadExtra();
  }, []);

  const cards = [
    { label: "Mahsulotlar", value: stats?.product_count || 0, icon: Package, color: "text-blue-500" },
    { label: "Buyurtmalar", value: stats?.orders_count || 0, icon: ShoppingCart, color: "text-green-500" },
    {
      label: "Daromad",
      value: `${Number(stats?.revenue || 0).toLocaleString("uz-UZ")} so'm`,
      icon: DollarSign,
      color: "text-yellow-500",
    },
    {
      label: "O'rtacha reyting",
      value: Number(stats?.avg_rating ?? 0).toFixed(1),
      icon: Star,
      color: "text-orange-500",
    },
  ];

  const { ordersByDay, revenueByDay, topProducts } = useMemo(() => {
    const days = lastNDaysKeys(7);
    const orderCount = new Map<string, number>();
    const revenueSum = new Map<string, number>();
    days.forEach((k) => {
      orderCount.set(k, 0);
      revenueSum.set(k, 0);
    });

    const productNameById = new Map<number, string>();
    products.forEach((p) => productNameById.set(p.id, p.name));

    const qtyMap = new Map<number, number>();

    for (const o of orders) {
      const dt =
        parseDate(o.created_at) ||
        parseDate(o.created) ||
        parseDate(o.createdAt);

      if (!dt) continue;
      const k = dayKey(dt);
      if (!orderCount.has(k)) continue;

      orderCount.set(k, (orderCount.get(k) || 0) + 1);

      // revenue: avval order.total ni sinaymiz, bo‘lmasa items’dan hisoblaymiz
      let orderTotal =
        Number((o as any).total ?? (o as any).total_price ?? 0);

      const items = (o as any).items ?? (o as any).order_items ?? (o as any).lines ?? [];
      if (!orderTotal && Array.isArray(items)) {
        orderTotal = items.reduce((sum: number, it: any) => {
          const qty = Number(it.quantity ?? it.qty ?? 0);
          const price = Number(it.total_price ?? it.price ?? 0);
          // agar total_price item-level bo‘lsa sum+=total_price, bo‘lmasa qty*price
          const val = it.total_price != null ? price : qty * price;
          return sum + (Number.isFinite(val) ? val : 0);
        }, 0);
      }

      revenueSum.set(k, (revenueSum.get(k) || 0) + orderTotal);

      // top products
      if (Array.isArray(items)) {
        for (const it of items) {
          const pid = it.product_id ?? it.product ?? it.product?.id;
          if (!pid) continue;
          const qty = Number(it.quantity ?? it.qty ?? 0);
          qtyMap.set(pid, (qtyMap.get(pid) || 0) + qty);
        }
      }
    }

    const ordersByDay = days.map((k) => ({ day: k.slice(5), orders: orderCount.get(k) || 0 }));
    const revenueByDay = days.map((k) => ({ day: k.slice(5), revenue: revenueSum.get(k) || 0 }));

    const topProducts = [...qtyMap.entries()]
      .map(([productId, qty]) => ({
        productId,
        name: productNameById.get(productId) || `#${productId}`,
        qty,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);

    return { ordersByDay, revenueByDay, topProducts };
  }, [orders, products]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          So‘nggi 7 kun tahlili
        </div>
      </div>

      {/* cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "..." : c.value}</div>
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
            {extraLoading ? (
              <div className="text-muted-foreground">Yuklanmoqda...</div>
            ) : orders.length === 0 ? (
              <div className="text-muted-foreground">Buyurtmalar ma’lumoti topilmadi.</div>
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
            <CardTitle>Haftalik daromad (7 kun)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {extraLoading ? (
              <div className="text-muted-foreground">Yuklanmoqda...</div>
            ) : orders.length === 0 ? (
              <div className="text-muted-foreground">Daromad ma’lumoti topilmadi.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* top products */}
      <Card>
        <CardHeader>
          <CardTitle>Haftalik eng ko‘p sotilgan mahsulotlar</CardTitle>
        </CardHeader>
        <CardContent>
          {extraLoading ? (
            <div className="text-muted-foreground">Yuklanmoqda...</div>
          ) : topProducts.length === 0 ? (
            <div className="text-muted-foreground">Hafta ichida sotuv topilmadi.</div>
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

export default SellerDashboard;