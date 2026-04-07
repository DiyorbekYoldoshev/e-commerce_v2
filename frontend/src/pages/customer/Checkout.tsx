import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi, billingApi } from "@/lib/api";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft, ShoppingBag, CheckCircle, Banknote,
  CalendarClock, CreditCard, Loader2, Lock,
} from "lucide-react";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ─── Stripe init ──────────────────────────────────────────────────────────────
// .env da VITE_STRIPE_PUBLISHABLE_KEY bo'lishi kerak
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const INSTALLMENT_MONTHS = [3, 6, 12];

// ─── CardElement styles ───────────────────────────────────────────────────────
const CARD_ELEMENT_OPTIONS = {
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

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = "form" | "stripe" | "success";

// ─── Inner form (has access to Stripe hooks) ──────────────────────────────────
const CheckoutForm: React.FC = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  // Step state
  const [step, setStep] = useState<Step>("form");

  // Form fields
  const [phone, setPhone]   = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "stripe" | "installment">("stripe");
  const [installmentMonths, setInstallmentMonths] = useState(3);

  // After order created
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [clientSecret, setClientSecret]     = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [stripeLoading, setStripeLoading]   = useState(false);
  const [stripeError, setStripeError]       = useState<string>("");

  if (!user) { navigate("/login"); return null; }

  if (items.length === 0 && step !== "success") {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Savat bo'sh</h1>
        <Button asChild><Link to="/products">Xarid qilish</Link></Button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="text-center py-20 max-w-md mx-auto px-4">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Buyurtma qabul qilindi!</h1>
        <p className="text-muted-foreground mb-6">
          {paymentMethod === "stripe"
            ? "To'lov muvaffaqiyatli amalga oshirildi."
            : paymentMethod === "installment"
            ? `${installmentMonths} oyga bo'lib to'lash rejasi yaratildi.`
            : "Yetkazib berilganda naqd pul bilan to'laysiz."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button asChild><Link to="/my-orders">Buyurtmalarim</Link></Button>
          <Button variant="outline" asChild><Link to="/products">Xarid davom ettirish</Link></Button>
        </div>
      </div>
    );
  }

  const monthlyAmount = paymentMethod === "installment"
    ? Math.ceil((totalAmount / installmentMonths) * 100) / 100
    : 0;

  // ── Step 1: Create order ───────────────────────────────────────────────────
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !address) {
      toast({ title: "Telefon va manzilni kiriting", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await orderApi.create({
        phone,
        address,
        is_installment: paymentMethod === "installment",
        installment_months: paymentMethod === "installment" ? installmentMonths : undefined,
        items: items.map(i => ({ variant: i.variant.id, quantity: i.quantity })),
      });

      const orderId = res.data?.id;
      setCreatedOrderId(orderId);

      if (paymentMethod === "cash") {
        // Naqd — tugadi
        clearCart();
        setStep("success");
      } else if (paymentMethod === "stripe" || paymentMethod === "installment") {
        // Stripe uchun intent yaratish
        const intentRes = await billingApi.createIntent({ order_id: orderId });
        setClientSecret(intentRes.data.client_secret);
        setStep("stripe");
      }
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  // ── Step 2: Confirm stripe payment ────────────────────────────────────────
  const handleStripePayment = async () => {
    if (!stripe || !elements || !clientSecret) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setStripeLoading(true);
    setStripeError("");

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          email: user.email,
          phone: phone,
        },
      },
    });

    if (error) {
      setStripeError(error.message || "To'lovda xatolik yuz berdi");
      setStripeLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      clearCart();
      setStep("success");
    }
    setStripeLoading(false);
  };

  // ── Render: Step 1 — Order form ───────────────────────────────────────────
  if (step === "form") {
    return (
      <form onSubmit={handleCreateOrder}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">

            {/* Delivery */}
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">Yetkazib berish</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Telefon raqam</Label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+998901234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manzil</Label>
                  <Textarea
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="To'liq manzilni kiriting"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">To'lov usuli</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={v => setPaymentMethod(v as typeof paymentMethod)}
                >
                  {/* Stripe */}
                  <label
                    htmlFor="stripe"
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      paymentMethod === "stripe" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="stripe" id="stripe" className="mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Karta bilan to'lash (Stripe)
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Visa, Mastercard va boshqa kartalar
                      </p>
                    </div>
                  </label>

                  {/* Cash */}
                  <label
                    htmlFor="cash"
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      paymentMethod === "cash" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="cash" id="cash" className="mt-0.5" />
                    <div>
                      <span className="font-medium text-sm flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        Naqd to'lov
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Yetkazib berilganda to'laysiz
                      </p>
                    </div>
                  </label>

                  {/* Installment */}
                  <label
                    htmlFor="installment"
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      paymentMethod === "installment" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="installment" id="installment" className="mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-purple-600" />
                        Bo'lib to'lash (nasiya)
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">Oyma-oy to'lang</p>
                    </div>
                  </label>
                </RadioGroup>

                {/* Installment months */}
                {paymentMethod === "installment" && (
                  <div className="space-y-3 pt-1 pl-1">
                    <Label className="text-sm">Muddat tanlang</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {INSTALLMENT_MONTHS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setInstallmentMonths(m)}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            installmentMonths === m
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="text-lg font-bold">{m}</div>
                          <div className="text-xs text-muted-foreground">oy</div>
                        </button>
                      ))}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jami:</span>
                        <span className="font-mono">{totalAmount.toLocaleString()} so'm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Muddat:</span>
                        <span>{installmentMonths} oy</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Oylik to'lov:</span>
                        <span className="text-primary">{monthlyAmount.toLocaleString()} so'm</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order summary */}
          <div className="md:col-span-2">
            <Card className="md:sticky md:top-20">
              <CardContent className="p-4 md:p-5 space-y-4">
                <h3 className="font-semibold">Buyurtma</h3>
                <div className="space-y-2 text-sm">
                  {items.map(i => (
                    <div key={i.variant.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">
                        {i.product.name} × {i.quantity}
                      </span>
                      <span className="whitespace-nowrap font-mono text-xs">
                        {(Number(i.variant.price) * i.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base md:text-lg">
                  <span>Jami:</span>
                  <span className="text-primary">{totalAmount.toLocaleString()} so'm</span>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Yuklanmoqda...</>
                  ) : paymentMethod === "cash" ? (
                    "Buyurtma berish"
                  ) : (
                    "Davom etish →"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    );
  }

  // ── Render: Step 2 — Stripe card input ───────────────────────────────────
  return (
    <div className="max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setStep("form")} className="gap-1 mb-2">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-green-600" />
            Karta ma'lumotlarini kiriting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount */}
          <div className="bg-muted/50 rounded-lg p-3 flex justify-between text-sm font-medium">
            <span>To'lov summasi:</span>
            <span className="text-primary font-bold">{totalAmount.toLocaleString()} so'm</span>
          </div>

          {/* Stripe CardElement */}
          <div className="border rounded-md p-3 bg-background focus-within:ring-2 focus-within:ring-ring transition-all">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>

          {/* Test card hint */}
          <p className="text-xs text-muted-foreground">
            Test karta: <span className="font-mono">4242 4242 4242 4242</span> ·
            Muddati: <span className="font-mono">12/34</span> ·
            CVC: <span className="font-mono">123</span>
          </p>

          {/* Error */}
          {stripeError && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {stripeError}
            </div>
          )}

          <Button
            onClick={handleStripePayment}
            disabled={stripeLoading || !stripe}
            className="w-full"
            size="lg"
          >
            {stripeLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> To'lanmoqda...</>
            ) : (
              <><Lock className="h-4 w-4 mr-2" /> To'lash</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            To'lov Stripe orqali xavfsiz amalga oshiriladi
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Wrapper with Elements provider ──────────────────────────────────────────
const Checkout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-2">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </Button>
      <h1 className="text-xl md:text-2xl font-bold mb-6">Buyurtma berish</h1>

      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
};

export default Checkout;