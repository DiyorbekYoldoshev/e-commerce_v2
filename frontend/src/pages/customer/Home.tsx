import React, { useEffect, useState } from "react";
import { productApi, categoryApi } from "@/lib/api";
import type { Product, Category } from "@/types";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, TrendingUp, Zap, Shield } from "lucide-react";

const API_BASE = "http://localhost:8000";

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          productApi.list({ ordering: "-created_at" }),
          categoryApi.list(),
        ]);
        setProducts((pRes.data?.results || pRes.data || []).slice(0, 8));
        setCategories((cRes.data?.results || cRes.data || []).slice(0, 6));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border p-8 md:p-14">
        <div className="max-w-2xl">
          <Badge className="mb-4">🔥 Eng yaxshi takliflar</Badge>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Sifatli mahsulotlar,<br />
            <span className="text-primary">eng yaxshi narxlarda</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            Minglab mahsulotlar orasidan o'zingizga keraklisini toping.
            Tez yetkazib berish va ishonchli to'lov.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link to="/products">Xarid qilish <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: "Tez yetkazib berish", desc: "1-3 kun ichida" },
          { icon: Shield, title: "Xavfsiz to'lov", desc: "100% himoyalangan" },
          { icon: TrendingUp, title: "Eng yaxshi narx", desc: "Raqobatbardosh narxlar" },
        ].map((f, i) => (
          <Card key={i} className="border-dashed">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold">Kategoriyalar</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${c.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <p className="font-medium text-sm">{c.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New Products */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">Yangi mahsulotlar</h2>
          <Button variant="ghost" asChild>
            <Link to="/products">Barchasini ko'rish <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="aspect-square bg-muted rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`}>
                <Card className="group hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden h-full">
                  <CardContent className="p-0">
                    <div className="aspect-square bg-muted overflow-hidden">
                      {p.image ? (
                        <img
                          src={p.image.startsWith("http") ? p.image : `${API_BASE}${p.image}`}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          Rasm yo'q
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{p.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span className="text-xs text-muted-foreground">
                          {p.average_rating?.toFixed(1)} ({p.reviews_count})
                        </span>
                      </div>
                      <p className="font-bold text-primary">
                        {Number(p.base_price).toLocaleString()} so'm
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
