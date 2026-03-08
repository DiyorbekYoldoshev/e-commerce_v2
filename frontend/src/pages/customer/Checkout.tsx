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
import { ArrowLeft, ShoppingBag, CheckCircle, Banknote, CalendarClock } from "lucide-react";

const INSTALLMENT_MONTHS = [3, 6, 12];

const Checkout: React.FC = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "installment">("cash");
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Savat bo'sh</h1>
        <Button asChild><Link to="/products">Xarid qilish</Link></Button>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="text-center py-20 max-w-md mx-auto px-4">
        <CheckCircle className="h-20 w-20 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Buyurtma qabul qilindi!</h1>
        <p className="text-muted-foreground mb-6">
          {paymentMethod === "installment"
            ? `${installmentMonths} oyga bo'lib to'lash rejasi yaratildi. Buyurtmalarim bo'limidan to'lovlarni kuzating.`
            : "Yetkazib berilganda naqd pul bilan to'laysiz."
          }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !address) {
      toast({ title: "Telefon va manzilni kiriting", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await orderApi.create({
        phone,
        address,
        is_installment: paymentMethod === "installment",
        installment_months: paymentMethod === "installment" ? installmentMonths : undefined,
        items: items.map(i => ({
          variant: i.variant.id,
          quantity: i.quantity,
        })),
      });
      clearCart();
      setOrderSuccess(true);
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-2">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </Button>
      <h1 className="text-xl md:text-2xl font-bold mb-6">Buyurtma berish</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">
            {/* Delivery info */}
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">Yetkazib berish</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Telefon raqam</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998901234567" />
                </div>
                <div className="space-y-2">
                  <Label>Manzil</Label>
                  <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="To'liq manzilni kiriting" rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">To'lov usuli</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "installment")}>
                  <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setPaymentMethod("cash")}>
                    <RadioGroupItem value="cash" id="cash" className="mt-0.5" />
                    <div className="flex-1">
                      <label htmlFor="cash" className="font-medium text-sm flex items-center gap-2 cursor-pointer">
                        <Banknote className="h-4 w-4 text-green-600" />
                        Naqd to'lov
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Yetkazib berilganda naqd pul bilan to'laysiz
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setPaymentMethod("installment")}>
                    <RadioGroupItem value="installment" id="installment" className="mt-0.5" />
                    <div className="flex-1">
                      <label htmlFor="installment" className="font-medium text-sm flex items-center gap-2 cursor-pointer">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        Bo'lib to'lash (nasiya)
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Oyma-oy bo'lib to'lang
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Installment months selection */}
                {paymentMethod === "installment" && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm">Muddat tanlang</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {INSTALLMENT_MONTHS.map((m) => (
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

                    {/* Installment preview */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Jami summa:</span>
                        <span className="font-mono">{totalAmount.toLocaleString()} so'm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Muddat:</span>
                        <span>{installmentMonths} oy</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm font-bold">
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
                        {i.product.name} x{i.quantity}
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
                {paymentMethod === "installment" && (
                  <div className="text-xs text-muted-foreground text-center bg-muted/50 rounded p-2">
                    {installmentMonths} oyga × {monthlyAmount.toLocaleString()} so'm
                  </div>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? "Yuborilmoqda..." : "Buyurtma berish"}
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
