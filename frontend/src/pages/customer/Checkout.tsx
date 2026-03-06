import React, { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { orderApi } from "@/lib/api";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ShoppingBag, CheckCircle } from "lucide-react";

const Checkout: React.FC = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);


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
      <div className="text-center py-20 max-w-md mx-auto">
        <CheckCircle className="h-20 w-20 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Buyurtma qabul qilindi!</h1>
        <p className="text-muted-foreground mb-6">
          Buyurtmangiz muvaffaqiyatli rasmiylashtirildi. Tez orada siz bilan bog'lanamiz.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild><Link to="/my-orders">Buyurtmalarim</Link></Button>
          <Button variant="outline" asChild><Link to="/products">Xarid davom ettirish</Link></Button>
        </div>
      </div>
    );
  }

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
        is_installment: isInstallment,
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
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </Button>
      <h1 className="text-2xl font-bold mb-6">Buyurtma berish</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Yetkazib berish ma'lumotlari</CardTitle></CardHeader>
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
                <div className="flex items-center justify-between">
                  <Label>Bo'lib to'lash (nasiya)</Label>
                  <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="sticky top-20">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">Buyurtma</h3>
                <div className="space-y-2 text-sm">
                  {items.map(i => (
                    <div key={i.variant.id} className="flex justify-between">
                      <span className="text-muted-foreground truncate max-w-[60%]">
                        {i.product.name} x{i.quantity}
                      </span>
                      <span>{(Number(i.variant.price) * i.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Jami:</span>
                  <span className="text-primary">{totalAmount.toLocaleString()} so'm</span>
                </div>
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
