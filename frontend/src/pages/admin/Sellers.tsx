import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { Seller } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminSellers: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Seller | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.sellers.list();
        setSellers(res.data?.results || res.data || []);
      } catch { setSellers([]); }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Sellerlar</h1>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Do'kon nomi</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Reyting</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : sellers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Seller topilmadi</TableCell></TableRow>
            ) : sellers.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(s)}>
                <TableCell className="font-mono text-xs">{s.id}</TableCell>
                <TableCell className="font-medium">{s.shop_name}</TableCell>
                <TableCell>{s.user_email}</TableCell>
                <TableCell>{s.phone_number}</TableCell>
                <TableCell>⭐ {s.rating?.toFixed(1)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {s.is_active && <Badge className="bg-green-600 text-white">Faol</Badge>}
                    {s.is_blocked && <Badge variant="destructive">Bloklangan</Badge>}
                    {s.is_verified && <Badge variant="outline">Tasdiqlangan</Badge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.shop_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Email:</span> {selected.user_email}</p>
              <p><span className="text-muted-foreground">Telefon:</span> {selected.phone_number}</p>
              <p><span className="text-muted-foreground">Manzil:</span> {selected.address}</p>
              <p><span className="text-muted-foreground">Tavsif:</span> {selected.description}</p>
              <p><span className="text-muted-foreground">Reyting:</span> ⭐ {selected.rating}</p>
              <p><span className="text-muted-foreground">Sana:</span> {new Date(selected.created_at).toLocaleDateString("uz")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSellers;
