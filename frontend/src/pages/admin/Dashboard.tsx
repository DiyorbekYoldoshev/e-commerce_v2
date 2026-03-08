import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi } from "@/lib/api";
import { Users, ShoppingCart, Package, Store } from "lucide-react";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, orders: 0, products: 0, sellers: 0 });
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
        setStats({
          users: usersRes.data?.length || usersRes.data?.results?.length || 0,
          orders: ordersRes.data?.length || ordersRes.data?.results?.length || 0,
          products: productsRes.data?.length || productsRes.data?.results?.length || 0,
          sellers: sellersRes.data?.length || sellersRes.data?.results?.length || 0,
        });
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: "Foydalanuvchilar", value: stats.users, icon: Users, color: "text-blue-500" },
    { label: "Buyurtmalar", value: stats.orders, icon: ShoppingCart, color: "text-green-500" },
    { label: "Mahsulotlar", value: stats.products, icon: Package, color: "text-orange-500" },
    { label: "Sellerlar", value: stats.sellers, icon: Store, color: "text-purple-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? "..." : c.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
