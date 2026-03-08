import React, { useEffect, useState } from "react";
import { sellerApi } from "@/lib/api";
import type { SellerStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, Star } from "lucide-react";

const SellerDashboard: React.FC = () => {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const cards = [
    { label: "Mahsulotlar", value: stats?.product_count || 0, icon: Package, color: "text-blue-500" },
    { label: "Buyurtmalar", value: stats?.orders_count || 0, icon: ShoppingCart, color: "text-green-500" },
    { label: "Daromad", value: `${stats?.revenue || 0} so'm`, icon: DollarSign, color: "text-yellow-500" },
    { label: "O'rtacha reyting", value: stats?.avg_rating?.toFixed(1) || "0", icon: Star, color: "text-orange-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seller Dashboard</h1>
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
    </div>
  );
};

export default SellerDashboard;
