import React, { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ShoppingBag, CheckCircle, Banknote,
  CalendarClock, CreditCard, Loader2, AlertCircle,
} from "lucide-react";

const INSTALLMENT_MONTHS = [3, 6, 12];

type Step = "form" | "payment" | "success";

interface CardItem {
  id: number;
  masked_number: string;
  expiration_date: string;
  balance: string;
}

const Checkout: React.FC = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("form");

  // Form fields
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "installment">("card");
  const [installmentMonths, setInstallmentMonths] = useState(3);

  // Karta
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [loadingCards, setLoadingCards] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Order yaratilgandan keyin
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const monthlyAmount = Math.ceil(totalAmount / installmentMonths);

  useEffect(() => {
    if (paymentMethod === "card" || paymentMethod === "installment") {
      loadCards();
    }
  }, [paymentMethod]);

  const loadCards = async () => {
    setLoadingCards(true);
    try {
      const [cardRes, balanceRes] = await Promise.all([
        billingApi.listCards(),
        billingApi.balance().catch(() => ({ data: { balance: "0" } })),
      ]);
      const cardList = cardRes.data?.results || cardRes.data || [];
      setCards(cardList);
      if (cardList.length > 0 && !selectedCardId) {
        setSelectedCardId(String(cardList[0].id));
      }
      setWalletBalance(Number(balanceRes.data?.balance || 0));
    } catch {
      setCards([]);
    }
    setLoadingCards(false);
  };

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
          {paymentMethod === "card"
            ? "Karta orqali to'lov muvaffaqiyatli amalga oshirildi."
            : paymentMethod === "installment"
            ? `${installmentMonths} oyga bo'lib to'lash rejasi yaratildi.`
            : "Yetkazib berilganda naqd pul bilan to'laysiz."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={() => navigate("/my-orders")}>Buyurtmalarim</Button>
          <Button variant="outline" onClick={() => navigate("/products")}>Xarid qilishni davom ettirish</Button>
        </div>
      </div>
    );
  }

  // Step 1: Buyurtma shakli
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !address) {
      toast({ title: "Telefon va manzilni kiriting", variant: "destructive" });
      return;
    }
    if ((paymentMethod === "card" || paymentMethod === "installment") && !selectedCardId) {
      toast({ title: "Karta tanlang", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await orderApi.create({
        phone,
        address,
        is_installment: paymentMethod === "installment",
        is_cash: paymentMethod === "cash",
        // is_cash=true bo'lsa online to'lov yo'q, admin tasdiqlaydi
        installment_months: paymentMethod === "installment" ? installmentMonths : undefined,
        items: items.map(i => ({ variant: i.variant.id, quantity: i.quantity })),
      });

      const orderId = res.data?.id;
      setCreatedOrderId(orderId);

      if (paymentMethod === "cash") {
        // Naqd to'lov — to'g'ridan-to'g'ri muvaffaqiyat
        clearCart();
        setStep("success");
      } else {
        // Karta yoki nasiya — to'lov sahifasiga o'tish
        setStep("payment");
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

  // Step 2: Karta orqali to'lov
  const handleCardPayment = async () => {
    if (!createdOrderId || !selectedCardId) return;
    setPaymentLoading(true);
    try {
      await billingApi.processPayment({
        order_id: createdOrderId,
        card_id: Number(selectedCardId),
      });
      clearCart();
      setStep("success");
      toast({ title: "To'lov muvaffaqiyatli bajarildi" });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || "To'lovda xatolik";
      toast({ title: "Xatolik", description: msg, variant: "destructive" });
    }
    setPaymentLoading(false);
  };

  // Step 2: Nasiya birinchi oylik to'lov
  const handleInstallmentFirstPayment = async () => {
    if (!createdOrderId || !selectedCardId) return;
    setPaymentLoading(true);
    try {
      // Nasiya yaratilganidan keyin birinchi oylikni to'lash
      // yoki shunchaki success ga o'tish (nasiya keyin to'lanadi)
      clearCart();
      setStep("success");
      toast({ title: "Nasiya rejasi yaratildi! Oyliklar jadvalda ko'rinadi." });
    } catch (err: any) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
    setPaymentLoading(false);
  };

  // ── Render: Step 2 — To'lov ──────────────────────────────────────────────
  if (step === "payment") {
    const selectedCard = cards.find(c => String(c.id) === selectedCardId);
    const cardBalance = selectedCard ? Number(selectedCard.balance) : 0;
    // Karta balansi yoki wallet balansidan biri yetarli bo'lsa to'lash mumkin
    const hasEnoughBalance = cardBalance >= totalAmount || walletBalance >= totalAmount;
    const balance = Math.max(cardBalance, walletBalance);

    return (
      <div className="max-w-md mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setStep("form")} className="gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" /> Orqaga
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              {paymentMethod === "installment" ? "Nasiya — karta tasdiqlash" : "Karta orqali to'lov"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summa */}
            <div className="bg-muted/50 rounded-lg p-3 flex justify-between text-sm font-medium">
              <span>{paymentMethod === "installment" ? "Jami summa:" : "To'lov summasi:"}</span>
              <span className="text-primary font-bold">{totalAmount.toLocaleString()} so'm</span>
            </div>

            {paymentMethod === "installment" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-purple-800">
                  <span>Oylik to'lov ({installmentMonths} oy):</span>
                  <span className="font-bold">{monthlyAmount.toLocaleString()} so'm</span>
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Birinchi oylikni hozir to'lasangiz yoki keyinroq "Buyurtmalarim" bo'limidan to'lashingiz mumkin.
                </p>
              </div>
            )}

            {/* Karta tanlash */}
            {cards.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Karta qo'shilmagan</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/cards")}>
                  Karta qo'shish
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Karta tanlang</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Karta tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={String(card.id)}>
                        {card.masked_number} · {card.expiration_date} · {Number(card.balance).toLocaleString()} so'm
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCard && (
                  <div className={`text-xs rounded-md px-3 py-2 flex items-center gap-1 ${
                    hasEnoughBalance
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}>
                    {hasEnoughBalance
                      ? `✓ Balans yetarli (karta: ${cardBalance.toLocaleString()} | wallet: ${walletBalance.toLocaleString()}) so'm`
                      : `✗ Balans yetarli emas. Karta: ${cardBalance.toLocaleString()} so'm, Wallet: ${walletBalance.toLocaleString()} so'm. Kerak: ${totalAmount.toLocaleString()} so'm`
                    }
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "installment" ? (
              <div className="space-y-2">
                <Button
                  onClick={handleInstallmentFirstPayment}
                  disabled={paymentLoading}
                  className="w-full"
                  size="lg"
                >
                  {paymentLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tasdiqlanmoqda...</>
                  ) : (
                    "Nasiya rejasini tasdiqlash"
                  )}
                </Button>
                <Button
                  onClick={handleCardPayment}
                  disabled={paymentLoading || !selectedCardId || !hasEnoughBalance}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {paymentLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> To'lanmoqda...</>
                  ) : (
                    <>Birinchi oylikni hozir to'lash ({monthlyAmount.toLocaleString()} so'm)</>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleCardPayment}
                disabled={paymentLoading || !selectedCardId || !hasEnoughBalance}
                className="w-full"
                size="lg"
              >
                {paymentLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> To'lanmoqda...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> {totalAmount.toLocaleString()} so'm to'lash</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render: Step 1 — Buyurtma shakli ─────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-2">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </Button>
      <h1 className="text-xl md:text-2xl font-bold mb-6">Buyurtma berish</h1>

      <form onSubmit={handleCreateOrder}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">

            {/* Yetkazib berish */}
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

            {/* To'lov usuli */}
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">To'lov usuli</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={v => setPaymentMethod(v as typeof paymentMethod)}
                >
                  {/* Karta bilan to'lash */}
                  <label
                    htmlFor="card"
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      paymentMethod === "card" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="card" id="card" className="mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Karta bilan to'lash
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Hisobingizga qo'shilgan karta orqali to'lang
                      </p>
                    </div>
                  </label>

                  {/* Naqd to'lov */}
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

                  {/* Nasiya */}
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

                {/* Nasiya oylari */}
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

                {/* Karta tanlash (card yoki installment uchun) */}
                {(paymentMethod === "card" || paymentMethod === "installment") && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm">Karta tanlang</Label>
                    {loadingCards ? (
                      <div className="text-xs text-muted-foreground">Kartalar yuklanmoqda...</div>
                    ) : cards.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>
                          Karta qo'shilmagan.{" "}
                          <Link to="/cards" className="underline font-medium">Karta qo'shish</Link>
                        </span>
                      </div>
                    ) : (
                      <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Karta tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {cards.map(card => (
                            <SelectItem key={card.id} value={String(card.id)}>
                              {card.masked_number} · Balans: {Number(card.balance).toLocaleString()} so'm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Buyurtma summasi */}
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
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={
                    submitting ||
                    ((paymentMethod === "card" || paymentMethod === "installment") && cards.length === 0)
                  }
                >
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
    </div>
  );
};

export default Checkout;
