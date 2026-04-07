import React, { useEffect, useState } from "react";
import { orderApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Order, Payment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Package, Eye, X, CalendarClock, CreditCard,
  CheckCircle2, Lock, Loader2,
} from "lucide-react";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, CardElement, useStripe, useElements,
} from "@stripe/react-stripe-js";

// ─── Stripe init ──────────────────────────────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda", confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda", shipped: "Jo'natildi",
  delivered: "Topshirildi", cancelled: "Bekor qilingan",
};
const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", processing: "secondary",
  shipped: "default", delivered: "default", cancelled: "destructive",
};
const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "To'lanmagan", paid: "To'langan",
  partial: "Qisman to'langan", refunded: "Qaytarilgan",
};
const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "text-red-500", paid: "text-green-600",
  partial: "text-yellow-600", refunded: "text-gray-500",
};
const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: "15px",
      color: "hsl(var(--foreground))",
      fontFamily: "inherit",
      "::placeholder": { color: "hsl(var(--muted-foreground))" },
    },
    invalid: { color: "hsl(var(--destructive))" },
  },
  hidePostalCode: true,
};

// ─── Stripe payment modal ─────────────────────────────────────────────────────
interface StripeModalProps {
  open: boolean;
  onClose: () => void;
  clientSecret: string;
  amount: number;
  userEmail: string;
  onSuccess: () => void;
}

const StripePaymentModal: React.FC<StripeModalProps> = ({
  open, onClose, clientSecret, amount, userEmail, onSuccess,
}) => {
  const stripe   = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setLoading(true);
    setError("");

    const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: { email: userEmail },
      },
    });

    if (stripeErr) {
      setError(stripeErr.message || "To'lovda xatolik yuz berdi");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      toast({ title: "✅ To'lov muvaffaqiyatli amalga oshirildi!" });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            Karta bilan to'lash
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="bg-muted/50 rounded-lg px-4 py-3 flex justify-between text-sm font-medium">
            <span>To'lov summasi:</span>
            <span className="text-primary font-bold">{amount.toLocaleString()} so'm</span>
          </div>

          {/* Card input */}
          <div className="border rounded-md p-3 bg-background focus-within:ring-2 focus-within:ring-ring transition-all">
            <CardElement options={CARD_OPTIONS} />
          </div>

          {/* Test hint */}
          <p className="text-xs text-muted-foreground">
            Test: <span className="font-mono">4242 4242 4242 4242</span> ·
            <span className="font-mono"> 12/34</span> ·
            <span className="font-mono"> 123</span>
          </p>

          {/* Error */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Bekor qilish
            </Button>
            <Button onClick={handlePay} disabled={loading || !stripe} className="flex-1">
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> To'lanmoqda...</>
                : <><Lock className="h-4 w-4 mr-1" /> To'lash</>}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" /> Stripe orqali xavfsiz to'lov
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const MyOrdersInner: React.FC = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Stripe modal state
  const [stripeOpen, setStripeOpen]         = useState(false);
  const [clientSecret, setClientSecret]     = useState("");
  const [payAmount, setPayAmount]           = useState(0);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.data?.results ?? res.data ?? []);
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

  // ── Open Stripe modal ──────────────────────────────────────────────────────
  const openStripe = async (orderId: number, amount: number, installmentId?: number) => {
    try {
      const payload: any = { order_id: orderId };
      if (installmentId) payload.installment_id = installmentId;

      const res = await billingApi.createIntent(payload);
      setClientSecret(res.data.client_secret);
      setPayAmount(amount);
      setPendingOrderId(orderId);
      setStripeOpen(true);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.error || err.response?.data?.detail || "To'lov boshlanmadi",
        variant: "destructive",
      });
    }
  };

  // To'lov muvaffaqiyatli bo'lganda orderni yangilash
  const onPaymentSuccess = async () => {
    await loadOrders();
    if (pendingOrderId && detailOrder?.id === pendingOrderId) {
      const res = await orderApi.detail(pendingOrderId);
      setDetailOrder(res.data);
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">#{o.id}</span>
                    <Badge variant={STATUS_COLORS[o.status_choices] || "outline"} className="text-xs">
                      {STATUS_LABELS[o.status_choices] || o.status_choices}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PAYMENT_COLORS[o.payment_status] || ""}`}
                    >
                      {PAYMENT_LABELS[o.payment_status] || o.payment_status}
                    </Badge>
                    {o.installment_plan && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {o.installment_plan.months} oy nasiya
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* ── Detail Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buyurtma #{detailOrder?.id}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Holat:</span>
                <span>{STATUS_LABELS[detailOrder.status_choices] || detailOrder.status_choices}</span>
                <span className="text-muted-foreground">To'lov:</span>
                <span className={PAYMENT_COLORS[detailOrder.payment_status]}>
                  {PAYMENT_LABELS[detailOrder.payment_status] || detailOrder.payment_status}
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
                            {item.product_name}
                            <span className="text-muted-foreground ml-1">({item.variant_sku})</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {Number(item.subtotal).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Jami:</span>
                <span className="text-primary">
                  {Number(detailOrder.payable_amount).toLocaleString()} so'm
                </span>
              </div>

              {/* Installment plan */}
              {detailOrder.installment_plan && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Bo'lib to'lash — {detailOrder.installment_plan.months} oy
                  </h4>
                  <div className="text-xs text-muted-foreground">
                    Oylik to'lov:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {Number(detailOrder.installment_plan.monthly_amount).toLocaleString()} so'm
                    </span>
                  </div>
                  <div className="space-y-2">
                    {detailOrder.installment_plan.payments.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {p.is_paid
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                          <span className="font-medium">{p.month}-oy</span>
                        </div>
                        <span className="font-mono text-xs">
                          {Number(p.amount).toLocaleString()} so'm
                        </span>
                        {p.is_paid ? (
                          <Badge className="text-[10px] bg-green-600">To'langan</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => openStripe(detailOrder.id, Number(p.amount), p.id)}
                          >
                            <CreditCard className="h-3 w-3" /> To'lash
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full payment button */}
              {!detailOrder.installment_plan
                && detailOrder.payment_status === "unpaid"
                && detailOrder.status_choices !== "cancelled" && (
                <Button
                  className="w-full gap-2"
                  onClick={() => openStripe(detailOrder.id, Number(detailOrder.payable_amount))}
                >
                  <CreditCard className="h-4 w-4" />
                  To'liq to'lov — {Number(detailOrder.payable_amount).toLocaleString()} so'm
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Stripe payment modal ───────────────────────────────────────────── */}
      <StripePaymentModal
        open={stripeOpen}
        onClose={() => setStripeOpen(false)}
        clientSecret={clientSecret}
        amount={payAmount}
        userEmail={user?.email || ""}
        onSuccess={onPaymentSuccess}
      />
    </div>
  );
};

// ─── Wrapper with Elements ────────────────────────────────────────────────────
const MyOrders: React.FC = () => (
  <Elements stripe={stripePromise}>
    <MyOrdersInner />
  </Elements>
);

export default MyOrders;
