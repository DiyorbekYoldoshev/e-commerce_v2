import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { Product } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.products.list(search ? { search } : undefined);
      setProducts(res.data?.results || res.data || []);
    } catch { setProducts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mahsulotlar</h1>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="pl-9 w-64"
          />
        </form>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Rasmi</TableHead>
              <TableHead>Nomi</TableHead>
              <TableHead>Narxi</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Reyting</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Mahsulot topilmadi</TableCell></TableRow>
            ) : products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-10 w-10 rounded-md object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                    </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono">{p.base_price} so'm</TableCell>
                <TableCell>{p.total_stock}</TableCell>
                <TableCell>⭐ {p.average_rating?.toFixed(1)} ({p.reviews_count})</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>
                    {p.status === "active" ? "Faol" : "Arxiv"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminProducts;
