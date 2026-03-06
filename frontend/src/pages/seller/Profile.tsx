import React, { useEffect, useState } from "react";
import { sellerApi, authApi } from "@/lib/api";
import type { Seller, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SellerProfile: React.FC = () => {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ shop_name: "", description: "", phone_number: "", address: "" });
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, uRes] = await Promise.all([sellerApi.me(), authApi.me()]);
        setSeller(sRes.data);
        setUser(uRes.data);
        setForm({
          shop_name: sRes.data.shop_name || "",
          description: sRes.data.description || "",
          phone_number: sRes.data.phone_number || "",
          address: sRes.data.address || "",
        });
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      await sellerApi.updateMe(form);
      toast({ title: "Profil yangilandi" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: JSON.stringify(err.response?.data), variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profilim</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Shaxsiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><span className="text-muted-foreground">Email:</span> {user?.email}</p>
          <p><span className="text-muted-foreground">Ism:</span> {user?.full_name || "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Do'kon ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Do'kon nomi</Label>
            <Input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tavsif</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+998901234567" />
            </div>
            <div className="space-y-2">
              <Label>Manzil</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSave}>Saqlash</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerProfile;
