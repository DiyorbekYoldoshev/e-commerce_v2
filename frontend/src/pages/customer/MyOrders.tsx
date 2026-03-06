import React, { useEffect, useState } from "react";
import { orderApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Eye, X } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped: "Jo'natildi",
  delivered: "Topshirildi",
  cancelled: "Bekor qilingan",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  processing: "secondary",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

const paymentLabels: Record<string, string> = {
  unpaid: "To'lanmagan",
  paid: "To'langan",
  partial: "Qisman",
  refunded: "Qaytarilgan",
};

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.data?.results || res.data || []);
    } catch {}
    setLoading(false);
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await orderApi.detail(id);
      setDetailOrder(res.data);
    } catch {}
  };

  const cancelOrder = async (id: number) => {
    if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
    try {
      await orderApi.cancel(id);
      toast({ title: "Buyurtma bekor qilindi" });
      loadOrders();
      setDetailOrder(null);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || "Bekor qilib bo'lmadi",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="h-6 w-6" /> Buyurtmalarim
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted" />
          <p>Hali buyurtma yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-semibold">#{o.id}</span>
                    <Badge variant={statusColors[o.status_choices] || "outline"}>
                      {statusLabels[o.status_choices] || o.status_choices}
                    </Badge>
                    <Badge variant="outline">
                      {paymentLabels[o.payment_status] || o.payment_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">
                      {Number(o.payable_amount).toLocaleString()} so'm
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("uz")}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => viewDetail(o.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {o.status_choices === "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => cancelOrder(o.id)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buyurtma #{detailOrder?.id}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Holat:</span>
                <span>{statusLabels[detailOrder.status_choices]}</span>
                <span className="text-muted-foreground">To'lov:</span>
                <span>{paymentLabels[detailOrder.payment_status]}</span>
                <span className="text-muted-foreground">Telefon:</span>
                <span>{detailOrder.phone}</span>
                <span className="text-muted-foreground">Manzil:</span>
                <span>{detailOrder.address}</span>
              </div>

              {detailOrder.items && detailOrder.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mahsulot</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Soni</TableHead>
                      <TableHead className="text-right">Jami</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailOrder.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.product_name}</TableCell>
                        <TableCell className="text-xs font-mono">{item.variant_sku}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{Number(item.subtotal).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Jami:</span>
                <span className="text-primary">{Number(detailOrder.payable_amount).toLocaleString()} so'm</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyOrders;
