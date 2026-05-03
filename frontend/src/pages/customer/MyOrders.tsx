import React, { useEffect, useState } from "react";
import { orderApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Order, Payment, Card as CardType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Package, Eye, X, CalendarClock, CreditCard, CheckCircle2,
  Banknote, Clock, AlertCircle,
} from "lucide-react";

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

interface PayDialogState {
  orderId: number;
  installmentId?: number;
  amount: string | number;
}

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [payTarget, setPayTarget] = useState<PayDialogState | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [oRes, pRes, cRes] = await Promise.all([
        orderApi.list(),
        billingApi.list().catch(() => ({ data: [] })),
        billingApi.listCards().catch(() => ({ data: [] })),
      ]);
      setOrders(oRes.data?.results || oRes.data || []);
      setPayments(pRes.data?.results || pRes.data || []);
      setCards(cRes.data?.results || cRes.data || []);
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
      loadAll();
      setDetailOrder(null);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || "Bekor qilib bo'lmadi",
        variant: "destructive",
      });
    }
  };

  const orderPayments = (orderId: number) =>
    payments.filter(p => (p.order ?? p.order_id) === orderId);

  const installmentPayment = (orderId: number, installmentId: number): Payment | undefined =>
    payments.find(p =>
      (p.order ?? p.order_id) === orderId &&
      p.installment_payment === installmentId &&
      p.status === "succeeded",
    );

  const openPayDialog = (orderId: number, amount: string | number, installmentId?: number) => {
    if (cards.length === 0) {
      toast({
        title: "Karta yo'q",
        description: "To'lov uchun avval karta qo'shing",
        variant: "destructive",
      });
      navigate("/cards");
      return;
    }
    setSelectedCardId(cards[0].id);
    setPayTarget({ orderId, installmentId, amount });
  };

  const confirmPayment = async () => {
    if (!payTarget || !selectedCardId) return;
    setSubmitting(true);
    try {
      const res = await billingApi.processPayment({
        order_id: payTarget.orderId,
        card_id: selectedCardId,
        installment_id: payTarget.installmentId,
      });
      toast({
        title: "To'lov muvaffaqiyatli",
        description: res.data?.message || "To'lov amalga oshirildi",
      });
      setPayTarget(null);
      await loadAll();
      // Detail ochiq bo'lsa yangilab ko'rsatish
      if (detailOrder) {
        const r = await orderApi.detail(detailOrder.id);
        setDetailOrder(r.data);
      }
    } catch (err: any) {
      toast({
        title: "To'lov amalga oshmadi",
        description: err.response?.data?.error || err.response?.data?.detail || "Xatolik",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 md:h-6 md:w-6" /> Buyurtmalarim
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/cards"><CreditCard className="h-4 w-4 mr-1" /> Kartalarim</Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted" />
          <p>Hali buyurtma yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const isInstallment = !!o.installment_plan;
            return (
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
                      {isInstallment ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {o.installment_plan!.months} oy nasiya
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Banknote className="h-3 w-3 text-green-600" />
                          Naqd to'lov
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
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyurtma #{detailOrder?.id}</DialogTitle>
          </DialogHeader>
          {detailOrder && (() => {
            const isInstallment = !!detailOrder.installment_plan;
            const isCash = !isInstallment;
            const orderPays = orderPayments(detailOrder.id);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Holat:</span>
                  <span>{statusLabels[detailOrder.status_choices]}</span>
                  <span className="text-muted-foreground">To'lov:</span>
                  <span className={paymentColors[detailOrder.payment_status]}>
                    {paymentLabels[detailOrder.payment_status]}
                  </span>
                  <span className="text-muted-foreground">To'lov turi:</span>
                  <span className="font-medium">
                    {isInstallment ? `Nasiya ${detailOrder.installment_plan!.months} oy` : "Naqd (yetkazilganda)"}
                  </span>
                  <span className="text-muted-foreground">Telefon:</span>
                  <span>{detailOrder.phone}</span>
                  <span className="text-muted-foreground">Manzil:</span>
                  <span>{detailOrder.address}</span>
                </div>

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
                              {item.product_name}
                              <span className="text-muted-foreground ml-1">({item.variant_sku})</span>
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

                {/* === NAQD TO'LOV — faqat info === */}
                {isCash && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Banknote className="h-4 w-4 text-green-600" />
                      Naqd to'lov ma'lumoti
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Bu buyurtma <span className="font-medium text-foreground">naqd to'lov</span> uchun tanlangan.
                      To'lov mahsulot yetkazib berilganda kuryerga naqd pul bilan amalga oshiriladi.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <span className="text-muted-foreground">To'lash kerak:</span>
                      <span className="font-mono font-semibold">{Number(detailOrder.payable_amount).toLocaleString()} so'm</span>
                      <span className="text-muted-foreground">To'lov holati:</span>
                      <span className={`font-medium ${paymentColors[detailOrder.payment_status]}`}>
                        {paymentLabels[detailOrder.payment_status]}
                      </span>
                    </div>
                    {detailOrder.status_choices === "delivered" && detailOrder.payment_status === "unpaid" && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Mahsulot topshirildi. Admin to'lovni tasdiqlashi kutilmoqda.
                      </div>
                    )}
                  </div>
                )}

                {/* === BO'LIB TO'LASH === */}
                {isInstallment && detailOrder.installment_plan && (
                  <div className="space-y-3">
                    <Separator />
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      Bo'lib to'lash rejasi — {detailOrder.installment_plan.months} oy
                    </h4>
                    {!detailOrder.installment_plan.is_approved && (
                      <div className="flex items-start gap-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                        <span className="text-yellow-800">
                          Nasiya rejasi admin tomonidan tasdiqlanishi kutilmoqda.
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Oylik to'lov: <span className="font-mono font-medium text-foreground">
                        {Number(detailOrder.installment_plan.monthly_amount).toLocaleString()} so'm
                      </span>
                    </div>
                    <div className="space-y-2">
                      {detailOrder.installment_plan.payments.map((p) => {
                        const paid = p.is_paid || !!installmentPayment(detailOrder.id, p.id);
                        const disabled =
                          paid || !detailOrder.installment_plan!.is_approved;

                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {paid ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                              )}
                              <span className="font-medium whitespace-nowrap">{p.month}-oy</span>
                            </div>
                            <span className="font-mono text-xs whitespace-nowrap">
                              {Number(p.amount).toLocaleString()} so'm
                            </span>
                            {paid ? (
                              <Badge variant="default" className="text-[10px] bg-green-600">To'langan</Badge>
                            ) : (
                              <Button
                                size="sm"
                                className="text-xs h-7 gap-1"
                                disabled={disabled}
                                onClick={() => openPayDialog(detailOrder.id, p.amount, p.id)}
                              >
                                <CreditCard className="h-3 w-3" /> To'lash
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* To'lov tarixi */}
                {orderPays.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Separator />
                    <h4 className="font-semibold text-sm">To'lov tarixi</h4>
                    <div className="space-y-1.5 text-xs">
                      {orderPays.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border">
                          <span className="text-muted-foreground">#{p.id}</span>
                          <span className="font-mono">{Number(p.amount).toLocaleString()} so'm</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("uz")}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              p.status === "succeeded" ? "text-green-700 border-green-200 bg-green-50" :
                              p.status === "pending" ? "text-yellow-700 border-yellow-200 bg-yellow-50" :
                              "text-red-700 border-red-200 bg-red-50"
                            }
                          >
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Karta tanlash + to'lovni tasdiqlash */}
      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>To'lovni tasdiqlash</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Summa:</span>
                <span className="font-bold text-primary">
                  {Number(payTarget.amount).toLocaleString()} so'm
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Karta tanlang:</p>
                {cards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Karta yo'q</p>
                ) : (
                  <div className="space-y-1.5">
                    {cards.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCardId(c.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                          selectedCardId === c.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "hover:border-muted-foreground/30"
                        }`}
                      >
                        <span className="font-mono">{c.masked_number || "**** **** **** ****"}</span>
                        <span className="text-xs text-muted-foreground">{c.expiration_date}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={submitting}>
              Bekor qilish
            </Button>
            <Button onClick={confirmPayment} disabled={submitting || !selectedCardId}>
              {submitting ? "To'lanmoqda..." : "To'lash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyOrders;