import React, { useEffect, useState } from "react";
import { orderApi } from "@/lib/api";
import type { Order } from "@/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Eye } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending:    "Kutilmoqda",
  confirmed:  "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped:    "Jo'natildi",
  delivered:  "Topshirildi",
  cancelled:  "Bekor qilindi",
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-500",
  confirmed:  "bg-blue-600",
  processing: "bg-purple-600",
  shipped:    "bg-indigo-600",
  delivered:  "bg-green-600",
  cancelled:  "bg-red-600",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid:  "To'lanmagan",
  paid:    "To'langan",
  partial: "Qisman",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid:  "text-red-500",
  paid:    "text-green-600",
  partial: "text-yellow-600",
};

// Seller o'zgartira oladigan statuslar (pending dan boshlab)
const NEXT_STATUSES: Record<string, { value: string; label: string }[]> = {
  pending:    [{ value: "confirmed",  label: "Tasdiqlash" }, { value: "cancelled", label: "Bekor qilish" }],
  confirmed:  [{ value: "processing", label: "Tayyorlanmoqda" }, { value: "cancelled", label: "Bekor qilish" }],
  processing: [{ value: "shipped",    label: "Jo'natildi" }],
  shipped:    [{ value: "delivered",  label: "Topshirildi" }],
  delivered:  [],
  cancelled:  [],
};

// ─── Component ────────────────────────────────────────────────────────────────

const SellerOrders: React.FC = () => {
  const { toast } = useToast();

  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.data?.results ?? res.data ?? []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: number) => {
    try {
      const res = await orderApi.detail(id);
      setSelected(res.data);
    } catch {}
  };

  const handleSetStatus = async (orderId: number, newStatus: string) => {
    if (newStatus === "cancelled") {
      if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
      setUpdating(true);
      try {
        await orderApi.cancel(orderId);
        toast({ title: "Buyurtma bekor qilindi" });
      } catch (err: any) {
        toast({
          title: "Xatolik",
          description: err.response?.data?.detail || "Bekor qilib bo'lmadi",
          variant: "destructive",
        });
        setUpdating(false);
        return;
      }
    } else {
      setUpdating(true);
      try {
        await orderApi.setStatus(orderId, newStatus);
        toast({ title: `Status: ${STATUS_LABELS[newStatus] || newStatus}` });
      } catch (err: any) {
        toast({
          title: "Xatolik",
          description: err.response?.data?.detail || "Status o'zgartirib bo'lmadi",
          variant: "destructive",
        });
        setUpdating(false);
        return;
      }
    }

    await load();
    // Detalni yangilash
    const res = await orderApi.detail(orderId);
    setSelected(res.data);
    setUpdating(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Buyurtmalar</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">ID</TableHead>
              <TableHead className="whitespace-nowrap">Holat</TableHead>
              <TableHead className="whitespace-nowrap">To'lov</TableHead>
              <TableHead className="whitespace-nowrap">Jami</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Sana</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Yuklanmoqda...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Buyurtma topilmadi
                </TableCell>
              </TableRow>
            ) : orders.map(o => (
              <TableRow
                key={o.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openDetail(o.id)}
              >
                <TableCell className="font-mono text-sm">#{o.id}</TableCell>
                <TableCell>
                  <Badge className={`${STATUS_COLORS[o.status_choices] || "bg-gray-500"} text-white text-xs`}>
                    {STATUS_LABELS[o.status_choices] || o.status_choices}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${PAYMENT_COLORS[o.payment_status] || ""}`}>
                    {PAYMENT_LABELS[o.payment_status] || o.payment_status}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm whitespace-nowrap">
                  {Number(o.payable_amount).toLocaleString()} so'm
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                  {new Date(o.created_at).toLocaleDateString("uz")}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyurtma #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-2 text-sm rounded-lg border p-3">
                <span className="text-muted-foreground">Holat:</span>
                <Badge className={`${STATUS_COLORS[selected.status_choices]} text-white text-xs w-fit`}>
                  {STATUS_LABELS[selected.status_choices] || selected.status_choices}
                </Badge>

                <span className="text-muted-foreground">To'lov:</span>
                <span className={`text-sm font-medium ${PAYMENT_COLORS[selected.payment_status]}`}>
                  {PAYMENT_LABELS[selected.payment_status] || selected.payment_status}
                </span>

                <span className="text-muted-foreground">Telefon:</span>
                <span>{selected.phone}</span>

                <span className="text-muted-foreground">Manzil:</span>
                <span>{selected.address}</span>

                <span className="text-muted-foreground">Jami:</span>
                <span className="font-mono font-bold">
                  {Number(selected.payable_amount).toLocaleString()} so'm
                </span>
              </div>

              {/* Items */}
              {selected.items && selected.items.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Mahsulotlar</p>
                  {selected.items.map(item => (
                    <div
                      key={item.id}
                      className="flex justify-between bg-muted/50 p-2.5 rounded-lg text-sm"
                    >
                      <span>
                        {item.product_name}
                        <span className="text-muted-foreground ml-1 text-xs">({item.variant_sku})</span>
                        <span className="text-muted-foreground ml-1">× {item.quantity}</span>
                      </span>
                      <span className="font-mono text-xs whitespace-nowrap">
                        {Number(item.subtotal).toLocaleString()} so'm
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status change */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerOrders;