import React, { useEffect, useState } from "react";
import { orderApi, billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types";
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
  CheckCircle2, Lock, Loader2, AlertCircle,
} from "lucide-react";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, CardElement, useStripe, useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Constants
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

// ─── Stripe Payment Modal ────────────────────────────────────────────────
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
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) {
      setError("To'lov tizimi tayyor emas");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Karta ma'lumotlari topilmadi");
      return;
    }

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
      toast({ title: "✅ To'lov muvaffaqiyatli!" });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            Karta bilan to'lash
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg px-4 py-3 flex justify-between text-sm font-medium">
            <span>To'lov summasi:</span>
            <span className="text-primary font-bold">{amount.toLocaleString()} so'm</span>
          </div>
          <div className="border rounded-md p-3 bg-background">
            <CardElement options={CARD_OPTIONS} />
          </div>
          <p className="text-xs text-muted-foreground">
            Test: 4242 4242 4242 4242 | 12/34 | 123
          </p>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Bekor qilish
            </Button>
            <Button onClick={handlePay} disabled={loading || !stripe} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {loading ? "To'lanmoqda..." : "To'lash"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────
const MyOrdersInner: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pendingInstallmentId, setPendingInstallmentId] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadOrders();
  }, [user, navigate]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.list();
      setOrders(res.data?.results ?? res.data ?? []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await orderApi.detail(id);
      setDetailOrder(res.data);
    } catch (error) {
      toast({ title: "Xatolik", description: "Buyurtma ma'lumotlarini yuklab bo'lmadi", variant: "destructive" });
    }
  };

  const cancelOrder = async (id: number) => {
    if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
    try {
      await orderApi.cancel(id);
      toast({ title: "✅ Buyurtma bekor qilindi" });
      await loadOrders();
      if (detailOrder?.id === id) setDetailOrder(null);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.response?.data?.detail || "Bekor qilib bo'lmadi", variant: "destructive" });
    }
  };

  const openStripe = async (orderId: number, amount: number, installmentId?: number) => {
    if (isPaying) {
      toast({ title: "Kuting", description: "Avvalgi to'lov jarayoni tugasin...", variant: "default" });
      return;
    }

    setIsPaying(true);

    try {
      const payload: any = { order_id: orderId };
      if (installmentId) payload.installment_id = installmentId;

      const res = await billingApi.createIntent(payload);
      setClientSecret(res.data.client_secret);
      setPayAmount(amount);
      setPendingOrderId(orderId);
      if (installmentId) setPendingInstallmentId(installmentId);
      setStripeOpen(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "To'lov boshlanmadi";
      toast({ title: "Xatolik", description: errorMsg, variant: "destructive" });
      setIsPaying(false);
    }
  };

  const onPaymentSuccess = async () => {
    await loadOrders();
    if (pendingOrderId) {
      try {
        const res = await orderApi.detail(pendingOrderId);
        setDetailOrder(res.data);
      } catch (e) { }
    }
    setPendingOrderId(null);
    setPendingInstallmentId(null);
    setIsPaying(false);
  };

  const handleStripeClose = () => {
    setStripeOpen(false);
    if (!isPaying) {
      setPendingOrderId(null);
      setPendingInstallmentId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="h-5 w-5" /> Buyurtmalarim
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Hali buyurtma yo'q</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/products")}>
            Mahsulotlarni ko'rish
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">#{o.id}</span>
                    <Badge variant={STATUS_COLORS[o.status_choices] || "outline"} className="text-xs">
                      {STATUS_LABELS[o.status_choices] || o.status_choices}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${PAYMENT_COLORS[o.payment_status] || ""}`}>
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
                    <Button variant="ghost" size="icon" onClick={() => viewDetail(o.id)} disabled={isPaying}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {o.status_choices === "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => cancelOrder(o.id)} disabled={isPaying}>
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
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
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
                <span className="break-words">{detailOrder.address}</span>
              </div>

              {detailOrder.items && detailOrder.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Mahsulot</TableHead>
                      <TableHead className="text-xs text-right">Soni</TableHead>
                      <TableHead className="text-xs text-right">Jami</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs">{item.product_name}</TableCell>
                        <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {Number(item.subtotal).toLocaleString()} so'm
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Jami:</span>
                <span className="text-primary">{Number(detailOrder.payable_amount).toLocaleString()} so'm</span>
              </div>

              {/* Installment plan */}
              {detailOrder.installment_plan && (
                <div className="space-y-3">
                  <Separator />
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Bo'lib to'lash — {detailOrder.installment_plan.months} oy
                  </h4>
                  <div className="space-y-2">
                    {detailOrder.installment_plan.payments?.map((p) => (
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
                          <Badge className="text-[10px] bg-green-600">To'langan</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => openStripe(detailOrder.id, Number(p.amount), p.id)}
                            disabled={isPaying}
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
              {!detailOrder.installment_plan && detailOrder.payment_status === "unpaid" && detailOrder.status_choices !== "cancelled" && (
                <Button className="w-full gap-2" onClick={() => openStripe(detailOrder.id, Number(detailOrder.payable_amount))} disabled={isPaying}>
                  <CreditCard className="h-4 w-4" />
                  To'liq to'lov — {Number(detailOrder.payable_amount).toLocaleString()} so'm
                </Button>
              )}

              {detailOrder.payment_status === "paid" && (
                <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm text-center">
                  <CheckCircle2 className="h-4 w-4 inline mr-2" />
                  Buyurtma to'langan
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StripePaymentModal
        open={stripeOpen}
        onClose={handleStripeClose}
        clientSecret={clientSecret}
        amount={payAmount}
        userEmail={user?.email || ""}
        onSuccess={onPaymentSuccess}
      />
    </div>
  );
};

// ─── Export ─────────────────────────────────────────────────────────────
const MyOrders: React.FC = () => (
  <Elements stripe={stripePromise}>
    <MyOrdersInner />
  </Elements>
);

export default MyOrders;