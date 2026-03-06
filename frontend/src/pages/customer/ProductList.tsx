import React, { useEffect, useState } from "react";
import { productApi, categoryApi } from "@/lib/api";
import type { Product, Category } from "@/types";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search, SlidersHorizontal } from "lucide-react";

const API_BASE = "http://localhost:8000";

const ProductList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [ordering, setOrdering] = useState("-created_at");

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { ordering };
      if (search.trim()) params.search = search;
      if (category && category !== "all") params.category = category;
      const res = await productApi.list(params);
      setProducts(res.data?.results || res.data || []);
    } catch { setProducts([]); }
    setLoading(false);
  };

  useEffect(() => {
    categoryApi.list().then(res => {
      setCategories(res.data?.results || res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [category, ordering]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mahsulotlar</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="pl-9"
          />
        </form>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Kategoriya" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ordering} onValueChange={setOrdering}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Saralash" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-created_at">Eng yangi</SelectItem>
            <SelectItem value="base_price">Narx: arzon → qimmat</SelectItem>
            <SelectItem value="-base_price">Narx: qimmat → arzon</SelectItem>
            <SelectItem value="name">Nomi: A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg mb-2">Mahsulot topilmadi</p>
          <p className="text-sm">Qidiruv so'rovini o'zgartiring</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    {p.total_stock === 0 && (
                      <span className="text-xs text-destructive">Tugagan</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;
