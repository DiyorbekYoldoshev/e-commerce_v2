import React, { useEffect, useState } from "react";
import { billingApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Card as CardType, Balance } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Plus, Trash2, Wallet, ArrowDownToLine } from "lucide-react";

const formatCardNumber = (v: string) =>
  v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

const formatExpiry = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const Cards: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cards, setCards] = useState<CardType[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [topupOpen, setTopupOpen] = useState(false);
  const [topupCardId, setTopupCardId] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState("");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        billingApi.listCards(),
        billingApi.balance().catch(() => ({ data: null })),
      ]);
      setCards(cRes.data?.results || cRes.data || []);
      setBalance(bRes.data || null);
    } catch {}
    setLoading(false);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\s/g, "");
    if (cleanNum.length !== 16) {
      toast({ title: "Karta raqami 16 xonali bo'lishi kerak", variant: "destructive" });
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiration)) {
      toast({ title: "Amal qilish muddati MM/YY formatida", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await billingApi.addCard({ card_number: cleanNum, expiration_date: expiration });
      toast({ title: "Karta qo'shildi" });
      setAddOpen(false);
      setCardNumber("");
      setExpiration("");
      loadAll();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Kartani o'chirmoqchimisiz?")) return;
    try {
      await billingApi.deleteCard(id);
      toast({ title: "Karta o'chirildi" });
      loadAll();
    } catch {
      toast({ title: "O'chirib bo'lmadi", variant: "destructive" });
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupCardId || !topupAmount) return;
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Summa noto'g'ri", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await billingApi.topUp({ card_id: topupCardId, amount: amt });
      toast({ title: "Balans to'ldirildi" });
      setTopupOpen(false);
      setTopupAmount("");
      loadAll();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || err.response?.data?.error || "To'ldirib bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Mening kartalarim
      </h1>

      {/* Balans */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hisob balansi</p>
              <p className="text-2xl font-bold">
                {balance ? Number(balance.balance).toLocaleString() : "0"} so'm
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            disabled={cards.length === 0}
            onClick={() => {
              setTopupCardId(cards[0]?.id ?? null);
              setTopupOpen(true);
            }}
          >
            <ArrowDownToLine className="h-4 w-4 mr-1" /> To'ldirish
          </Button>
        </CardContent>
      </Card>

      {/* Kartalar */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Kartalar</CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Qo'shish</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Yangi karta qo'shish</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Karta raqami</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                    maxLength={19}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Amal qilish muddati</Label>
                  <Input
                    value={expiration}
                    onChange={(e) => setExpiration(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-6">Yuklanmoqda...</p>
          ) : cards.length === 0 ? (
            <div className="text-center py-10">
              <CreditCard className="h-12 w-12 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Hali karta yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="relative p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-md"
                >
                  <CreditCard className="h-6 w-6 mb-6 opacity-80" />
                  <p className="font-mono tracking-widest text-base">
                    {c.masked_number || "**** **** **** ****"}
                  </p>
                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <p className="text-[10px] uppercase opacity-60">Amal qiladi</p>
                      <p className="font-mono text-sm">{c.expiration_date}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balansni to'ldirish */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Balansni to'ldirish</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTopup} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Karta tanlang</Label>
              <div className="space-y-1.5">
                {cards.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTopupCardId(c.id)}
                    className={`w-full flex justify-between items-center p-2.5 rounded border text-sm ${
                      topupCardId === c.id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <span className="font-mono">{c.masked_number}</span>
                    <span className="text-xs text-muted-foreground">{c.expiration_date}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Summa (so'm)</Label>
              <Input
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="100000"
                inputMode="numeric"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTopupOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={submitting || !topupCardId}>
                {submitting ? "..." : "To'ldirish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cards;
