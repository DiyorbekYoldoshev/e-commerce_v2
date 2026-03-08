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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Mahsulotlar</h1>
        <form onSubmit={handleSearch} className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9 w-full sm:w-64" />
        </form>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">ID</TableHead>
              <TableHead className="whitespace-nowrap">Nomi</TableHead>
              <TableHead className="whitespace-nowrap">Narxi</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Stock</TableHead>
              <TableHead className="whitespace-nowrap hidden md:table-cell">Reyting</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
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
                <TableCell className="font-medium text-xs md:text-sm max-w-[150px] truncate">{p.name}</TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap">{Number(p.base_price).toLocaleString()} so'm</TableCell>
                <TableCell className="hidden sm:table-cell">{p.total_stock}</TableCell>
                <TableCell className="hidden md:table-cell">⭐ {p.average_rating?.toFixed(1)} ({p.reviews_count})</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">
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
