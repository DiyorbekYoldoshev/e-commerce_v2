import React, { useEffect, useState } from "react";
import { adminApi, orderApi } from "@/lib/api";
import type { Order } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped: "Jo'natildi",
  delivered: "Topshirildi",
  cancelled: "Bekor qilindi",
};

const paymentLabels: Record<string, string> = {
  unpaid: "To'lanmagan",
  paid: "To'langan",
  partial: "Qisman",
  refunded: "Qaytarilgan",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-600",
  confirmed: "bg-blue-600",
  processing: "bg-purple-600",
  shipped: "bg-indigo-600",
  delivered: "bg-green-600",
  cancelled: "bg-red-600",
};

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();

  const load = async (filter: string) => {
    setLoading(true);
    try {
      const res = filter === "all"
        ? await adminApi.orders.list()
        : await adminApi.orders.byStatus(filter);
      setOrders(res.data?.results || res.data || []);
    } catch { setOrders([]); }
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleSetStatus = async () => {
    if (!selected || !newStatus) return;
    try {
      await orderApi.setStatus(selected.id, newStatus);
      toast({ title: "Status yangilandi" });
      setSelected(null);
      load(tab);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.response?.data?.detail, variant: "destructive" });
    }
  };

  const openDetail = async (id: number) => {
    try {
      const res = await adminApi.orders.detail(id);
      setSelected(res.data);
      setNewStatus(res.data.status_choices);
    } catch {}
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buyurtmalar</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Barchasi</TabsTrigger>
          {Object.keys(statusLabels).map((s) => (
            <TabsTrigger key={s} value={s}>{statusLabels[s]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 rounded-lg border bg-card">
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
                <TableCell>
                  <Badge variant="outline">{paymentLabels[o.payment_status] || o.payment_status}</Badge>
                </TableCell>
                <TableCell className="font-mono">{o.payable_amount} so'm</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(o.created_at).toLocaleDateString("uz")}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Ko'rish</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order detail dialog */}
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
                <div>
                  <h4 className="font-medium mb-2">Mahsulotlar:</h4>
                  <div className="space-y-1 text-sm">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex justify-between bg-muted p-2 rounded">
                        <span>{item.product_name} ({item.variant_sku}) x{item.quantity}</span>
                        <span className="font-mono">{item.subtotal} so'm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSetStatus} size="sm">Saqlash</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
