import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, sellerApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Save, Store, Clock, CheckCircle2, XCircle, Send } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerRequestStatus {
  id: number;
  shop_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  review_reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUEST_STATUS_CONFIG = {
  pending:  { label: "Ko'rib chiqilmoqda", icon: Clock,         className: "bg-yellow-500 text-white" },
  approved: { label: "Tasdiqlandi",        icon: CheckCircle2,  className: "bg-green-600 text-white"  },
  rejected: { label: "Rad etildi",         icon: XCircle,       className: "bg-red-600 text-white"    },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [profileForm, setProfileForm] = useState({ phone: "", bio: "" });
  const [pwForm, setPwForm] = useState({
    old_password: "", new_password: "", new_password_confirm: "",
  });

  // ── Seller request ─────────────────────────────────────────────────────────
  const [sellerForm, setSellerForm] = useState({
    shop_name: "", description: "", phone_number: "", address: "",
  });
  const [myRequests, setMyRequests] = useState<SellerRequestStatus[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [saving, setSaving] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    setForm({ first_name: user.first_name || "", last_name: user.last_name || "" });
    if (user.profile) {
      setProfileForm({ phone: user.profile.phone || "", bio: user.profile.bio || "" });
    }
    loadMyRequests();
  }, [user]);

  const loadMyRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await sellerApi.myRequests();
      setMyRequests(res.data || []);
    } catch {
      setMyRequests([]);
    }
    setRequestsLoading(false);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const saveInfo = async () => {
    setSaving(true);
    try {
      await authApi.updateMe(form);
      toast({ title: "Saqlandi ✓" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: JSON.stringify(err.response?.data), variant: "destructive" });
    }
    setSaving(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (profileForm.phone) fd.append("phone", profileForm.phone);
      if (profileForm.bio)   fd.append("bio", profileForm.bio);
      await authApi.updateProfile(fd);
      toast({ title: "Profil yangilandi ✓" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: JSON.stringify(err.response?.data), variant: "destructive" });
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      toast({ title: "Parollar mos emas", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(pwForm);
      toast({ title: "Parol o'zgartirildi ✓" });
      setPwForm({ old_password: "", new_password: "", new_password_confirm: "" });
    } catch (err: any) {
      toast({ title: "Xatolik", description: JSON.stringify(err.response?.data), variant: "destructive" });
    }
    setSaving(false);
  };

  const submitSellerRequest = async () => {
    const { shop_name, description, phone_number, address } = sellerForm;
    if (!shop_name || !description || !phone_number || !address) {
      toast({ title: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sellerApi.requestCreate(sellerForm);
      toast({ title: "Ariza yuborildi ✓", description: "Admin ko'rib chiqadi." });
      setSellerForm({ shop_name: "", description: "", phone_number: "", address: "" });
      loadMyRequests();
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        JSON.stringify(err.response?.data);
      toast({ title: "Xatolik", description: detail, variant: "destructive" });
    }
    setSubmitting(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  // Pending ariza bor bo'lsa yangi ariza yuborish bloklanadi
  const hasPendingRequest = myRequests.some((r) => r.status === "pending");
  // Tasdiqlangan bo'lsa form ko'rsatilmaydi
  const isApproved = myRequests.some((r) => r.status === "approved");
  // Yangi ariza yuborish mumkinmi
  const canSubmit = !hasPendingRequest && !isApproved;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User className="h-6 w-6" /> Profilim
      </h1>

      {/* ── Asosiy ma'lumotlar ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Familiya</Label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
          <Button onClick={saveInfo} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" /> Saqlash
          </Button>
        </CardContent>
      </Card>

      {/* ── Profil ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="+998..."
            />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              rows={3}
            />
          </div>
          <Button onClick={saveProfile} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" /> Saqlash
          </Button>
        </CardContent>
      </Card>

      {/* ── Parol ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-4 w-4" /> Parolni o'zgartirish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Joriy parol</Label>
            <Input
              type="password"
              value={pwForm.old_password}
              onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yangi parol</Label>
              <Input
                type="password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tasdiqlash</Label>
              <Input
                type="password"
                value={pwForm.new_password_confirm}
                onChange={(e) => setPwForm({ ...pwForm, new_password_confirm: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={changePassword} disabled={saving} size="sm">
            <Lock className="h-4 w-4 mr-1" /> O'zgartirish
          </Button>
        </CardContent>
      </Card>

      {/* ── Seller bo'lish ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5" /> Seller bo'lish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Mavjud arizalar tarixi */}
          {requestsLoading ? (
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          ) : myRequests.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Arizalarim</p>
              <div className="rounded-lg border divide-y">
                {myRequests.map((r) => {
                  const cfg = REQUEST_STATUS_CONFIG[r.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={r.id} className="flex items-start justify-between px-4 py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.shop_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("uz")}
                        </p>
                        {/* Rad etish sababi */}
                        {r.status === "rejected" && r.review_reason && (
                          <p className="text-xs text-red-500 mt-1">
                            Sabab: {r.review_reason}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-[11px] shrink-0 flex items-center gap-1 ${cfg.className}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Tasdiqlangan — seller panel ga yo'naltirish */}
          {isApproved && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Siz seller sifatida tasdiqlangansiz! Seller panelida mahsulot qo'shishingiz mumkin.
            </div>
          )}

          {/* Pending — kutish xabari */}
          {hasPendingRequest && !isApproved && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              Arizangiz ko'rib chiqilmoqda. Iltimos kuting.
            </div>
          )}

          {/* Yangi ariza yuborish formasi */}
          {canSubmit && (
            <div className="space-y-4 pt-1">
              {myRequests.some((r) => r.status === "rejected") && (
                <p className="text-sm text-muted-foreground">
                  Avvalgi arizangiz rad etildi. Yangi ariza yuborishingiz mumkin.
                </p>
              )}

              <div className="space-y-2">
                <Label>Do'kon nomi <span className="text-red-500">*</span></Label>
                <Input
                  value={sellerForm.shop_name}
                  onChange={(e) => setSellerForm({ ...sellerForm, shop_name: e.target.value })}
                  placeholder="Masalan: Texno Market"
                />
              </div>

              <div className="space-y-2">
                <Label>Telefon <span className="text-red-500">*</span></Label>
                <Input
                  value={sellerForm.phone_number}
                  onChange={(e) => setSellerForm({ ...sellerForm, phone_number: e.target.value })}
                  placeholder="+998901234567"
                />
              </div>

              <div className="space-y-2">
                <Label>Manzil <span className="text-red-500">*</span></Label>
                <Input
                  value={sellerForm.address}
                  onChange={(e) => setSellerForm({ ...sellerForm, address: e.target.value })}
                  placeholder="Toshkent, Chilonzor..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tavsif <span className="text-red-500">*</span></Label>
                <Textarea
                  value={sellerForm.description}
                  onChange={(e) => setSellerForm({ ...sellerForm, description: e.target.value })}
                  placeholder="Do'koningiz haqida qisqacha ma'lumot..."
                  rows={3}
                />
              </div>

              <Button
                onClick={submitSellerRequest}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Yuborilmoqda..." : "Ariza yuborish"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerProfile;