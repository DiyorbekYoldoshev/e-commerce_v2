import React, { useEffect, useState } from "react";
import { orderApi } from "@/lib/api";
import type { Order } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda", confirmed: "Tasdiqlangan", processing: "Tayyorlanmoqda",
  shipped: "Jo'natildi", delivered: "Topshirildi", cancelled: "Bekor qilindi",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-600", confirmed: "bg-blue-600", processing: "bg-purple-600",
  shipped: "bg-indigo-600", delivered: "bg-green-600", cancelled: "bg-red-600",
};

const SellerOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.data?.results || res.data || []);
    } catch { setOrders([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: number) => {
    try {
      const res = await orderApi.detail(id);
      setSelected(res.data);
    } catch {}
  };

  const handleCancel = async (id: number) => {
    try {
      await orderApi.cancel(id);
      toast({ title: "Buyurtma bekor qilindi" });
      setSelected(null);
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.response?.data?.detail, variant: "destructive" });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buyurtmalarim</h1>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>To'lov</TableHead>
              <TableHead>Jami</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Buyurtma topilmadi</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(o.id)}>
                <TableCell className="font-mono">#{o.id}</TableCell>
                <TableCell>
                  <Badge className={`${statusColors[o.status_choices] || ""} text-white`}>
                    {statusLabels[o.status_choices] || o.status_choices}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant="outline">{o.payment_status}</Badge></TableCell>
                <TableCell className="font-mono">{o.payable_amount} so'm</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("uz")}
                </TableCell>
                <TableCell><Button variant="ghost" size="sm">Ko'rish</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buyurtma #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Manzil:</span> {selected.address}</div>
                <div><span className="text-muted-foreground">Telefon:</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">Jami:</span> {selected.total_amount} so'm</div>
                <div><span className="text-muted-foreground">To'lov:</span> {selected.payable_amount} so'm</div>
              </div>
              {selected.items && selected.items.length > 0 && (
                <div className="space-y-1 text-sm">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex justify-between bg-muted p-2 rounded">
                      <span>{item.product_name} ({item.variant_sku}) x{item.quantity}</span>
                      <span className="font-mono">{item.subtotal} so'm</span>
                    </div>
                  ))}
                </div>
              )}
              {selected.status_choices !== "cancelled" && selected.status_choices !== "delivered" && (
                <Button variant="destructive" onClick={() => handleCancel(selected.id)} className="w-full">
                  Bekor qilish
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerOrders;
