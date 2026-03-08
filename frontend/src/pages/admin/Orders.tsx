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
import { AlertTriangle, Lock } from "lucide-react";

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
  partial: "Qisman to'langan",
  refunded: "Qaytarilgan",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-green-100 text-green-700 border-green-200",
  partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  refunded: "bg-gray-100 text-gray-700 border-gray-200",
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

  // Only allow order status change, NOT payment status
  const handleSetStatus = async () => {
    if (!selected || !newStatus) return;
    try {
      await orderApi.setStatus(selected.id, newStatus);
      toast({ title: "Buyurtma holati yangilandi" });
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

  // Check if payment status can be shown as locked
  const isPaymentLocked = (order: Order) => {
    return order.payment_status === "paid" || order.payment_status === "partial";
  };

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Buyurtmalar</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs md:text-sm">Barchasi</TabsTrigger>
          {Object.keys(statusLabels).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs md:text-sm">{statusLabels[s]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">ID</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">To'lov</TableHead>
              <TableHead className="whitespace-nowrap">Jami</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Sana</TableHead>
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
                <TableCell className="font-mono text-xs">#{o.id}</TableCell>
                <TableCell>
                  <Badge className={`${statusColors[o.status_choices] || ""} text-white text-xs`}>
                    {statusLabels[o.status_choices] || o.status_choices}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${paymentColors[o.payment_status] || ""}`}>
                    {paymentLabels[o.payment_status] || o.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs whitespace-nowrap">{Number(o.payable_amount).toLocaleString()} so'm</TableCell>
                <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">
                  {new Date(o.created_at).toLocaleDateString("uz")}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="text-xs">Ko'rish</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyurtma #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Manzil:</span> {selected.address}</div>
                <div><span className="text-muted-foreground">Telefon:</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">Jami:</span> {Number(selected.total_amount).toLocaleString()} so'm</div>
                <div><span className="text-muted-foreground">To'lov:</span> {Number(selected.payable_amount).toLocaleString()} so'm</div>
              </div>

              {/* Payment status - READ ONLY */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  To'lov holati
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={paymentColors[selected.payment_status] || ""}>
                    {paymentLabels[selected.payment_status] || selected.payment_status}
                  </Badge>
                  {isPaymentLocked(selected) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      To'lov holati avtomatik boshqariladi
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  To'lov holati faqat to'lov tizimi orqali avtomatik o'zgaradi. Admin tomonidan o'zgartirib bo'lmaydi.
                </p>
              </div>

              {/* Installment info */}
              {selected.installment_plan && (
                <div className="rounded-lg border p-3 space-y-2">
                  <h4 className="text-sm font-medium">Bo'lib to'lash rejasi</h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Muddat:</span>
                    <span>{selected.installment_plan.months} oy</span>
                    <span className="text-muted-foreground">Oylik:</span>
                    <span>{Number(selected.installment_plan.monthly_amount).toLocaleString()} so'm</span>
                  </div>
                  {selected.installment_plan.payments && selected.installment_plan.payments.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {selected.installment_plan.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1.5 rounded">
                          <span>{p.month}-oy</span>
                          <span className="font-mono">{Number(p.amount).toLocaleString()} so'm</span>
                          <Badge variant={p.is_paid ? "default" : "outline"} className="text-[10px] px-1.5">
                            {p.is_paid ? "To'langan" : "Kutilmoqda"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selected.items && selected.items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Mahsulotlar:</h4>
                  <div className="space-y-1 text-sm">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex justify-between bg-muted p-2 rounded text-xs">
                        <span className="truncate max-w-[60%]">{item.product_name} ({item.variant_sku}) x{item.quantity}</span>
                        <span className="font-mono whitespace-nowrap">{Number(item.subtotal).toLocaleString()} so'm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order status - admin CAN change this */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buyurtma holati</label>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
