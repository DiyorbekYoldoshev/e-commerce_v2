import React, { useEffect, useState } from "react";
import { orderApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Order, Payment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Package, Eye, X, CalendarClock, Banknote, CreditCard, CheckCircle2 } from "lucide-react";

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
  partial: "Qisman to'langan",
  refunded: "Qaytarilgan",
};

const paymentColors: Record<string, string> = {
  unpaid: "text-red-600",
  paid: "text-green-600",
  partial: "text-yellow-600",
  refunded: "text-gray-600",
};

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadOrders();
    loadPayments();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.data?.results || res.data || []);
    } catch {}
    setLoading(false);
  };

  const loadPayments = async () => {
    try {
      const res = await billingApi.list();
      setPayments(res.data?.results || res.data || []);
    } catch {}
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

  const handlePayInstallment = async (orderId: number, installmentId: number) => {
    try {
      const res = await billingApi.createIntent({ order_id: orderId, installment_id: installmentId });
      // In production, this would open Stripe checkout with client_secret
      toast({
        title: "To'lov",
        description: "To'lov tizimiga yo'naltirilmoqda... (Stripe integration)",
      });
      // For now just log - real implementation would use Stripe.js
      console.log("Stripe client_secret:", res.data.client_secret);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || "To'lov amalga oshmadi",
        variant: "destructive",
      });
    }
  };

  const handlePayFull = async (orderId: number) => {
    try {
      const res = await billingApi.createIntent({ order_id: orderId });
      toast({
        title: "To'lov",
        description: "To'lov tizimiga yo'naltirilmoqda... (Stripe integration)",
      });
      console.log("Stripe client_secret:", res.data.client_secret);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || "To'lov amalga oshmadi",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="h-5 w-5 md:h-6 md:w-6" /> Buyurtmalarim
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
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <span className="font-mono text-sm font-semibold">#{o.id}</span>
                    <Badge variant={statusColors[o.status_choices] || "outline"} className="text-xs">
                      {statusLabels[o.status_choices] || o.status_choices}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${paymentColors[o.payment_status] || ""}`}>
                      {paymentLabels[o.payment_status] || o.payment_status}
                    </Badge>
                    {o.installment_plan && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {o.installment_plan.months} oy nasiya
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="font-bold text-primary text-sm">
                      {Number(o.payable_amount).toLocaleString()} so'm
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyurtma #{detailOrder?.id}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Holat:</span>
                <span>{statusLabels[detailOrder.status_choices]}</span>
                <span className="text-muted-foreground">To'lov:</span>
                <span className={paymentColors[detailOrder.payment_status]}>
                  {paymentLabels[detailOrder.payment_status]}
                </span>
                <span className="text-muted-foreground">Telefon:</span>
                <span>{detailOrder.phone}</span>
                <span className="text-muted-foreground">Manzil:</span>
                <span>{detailOrder.address}</span>
              </div>

              {/* Items */}
              {detailOrder.items && detailOrder.items.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Mahsulot</TableHead>
                        <TableHead className="text-xs text-right">Soni</TableHead>
                        <TableHead className="text-xs text-right">Jami</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailOrder.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">
                              <div className="font-medium">{item.product_name}</div>

                              <div className="text-muted-foreground text-[11px] space-x-2">
                                <span>SKU: {item.variant_sku}</span>

                                {item.variant_color && (
                                  <span>• Rang: {item.variant_color}</span>
                                )}

                                {item.variant_size && (
                                  <span>• Size: {item.variant_size}</span>
                                )}
                              </div>
                          </TableCell>
                          <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{Number(item.subtotal).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
                <span>Jami:</span>
                <span className="text-primary">{Number(detailOrder.payable_amount).toLocaleString()} so'm</span>
              </div>

              {/* Installment Plan */}
              {detailOrder.installment_plan && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Bo'lib to'lash rejasi — {detailOrder.installment_plan.months} oy
                  </h4>
                  <div className="text-xs text-muted-foreground">
                    Oylik to'lov: <span className="font-mono font-medium text-foreground">
                      {Number(detailOrder.installment_plan.monthly_amount).toLocaleString()} so'm
                    </span>
                  </div>
                  <div className="space-y-2">
                    {detailOrder.installment_plan.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm">
                        <div className="flex items-center gap-2">
                          {p.is_paid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <span className="font-medium">{p.month}-oy</span>
                        </div>
                        <span className="font-mono text-xs">{Number(p.amount).toLocaleString()} so'm</span>
                        {p.is_paid ? (
                          <Badge variant="default" className="text-[10px] bg-green-600">To'langan</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => handlePayInstallment(detailOrder.id, p.id)}
                          >
                            <CreditCard className="h-3 w-3" /> To'lash
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full payment button for non-installment unpaid orders */}
              {!detailOrder.installment_plan && detailOrder.payment_status === "unpaid" && detailOrder.status_choices !== "cancelled" && (
                <div className="pt-2">
                  <Button className="w-full gap-2" onClick={() => handlePayFull(detailOrder.id)}>
                    <CreditCard className="h-4 w-4" />
                    To'liq to'lov qilish — {Number(detailOrder.payable_amount).toLocaleString()} so'm
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyOrders;
