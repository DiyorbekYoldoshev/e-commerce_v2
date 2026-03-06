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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { User, Lock, Save } from "lucide-react";

const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
  });

  const [profileForm, setProfileForm] = useState({
    phone: "",
    bio: "",
  });

  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });

  const [sellerForm, setSellerForm] = useState({
    shop_name: "",
    phone_number: "",
    address: "",
    description: "",
  });

  const [requests, setRequests] = useState<any[]>([]);
  const [loadingReq, setLoadingReq] = useState(true);

  const [savingInfo, setSavingInfo] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingSeller, setSavingSeller] = useState(false);

  const loadMyRequests = async () => {
    setLoadingReq(true);
    try {
      const res = await sellerApi.myRequests();
      setRequests(res.data?.results ?? res.data ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingReq(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
    });

    const profilePhone = user.profile?.phone || "";
    const profileBio = user.profile?.bio || "";

    setProfileForm({
      phone: profilePhone,
      bio: profileBio,
    });

    setSellerForm((prev) => ({
      ...prev,
      phone_number: profilePhone,
    }));

    loadMyRequests();
  }, [user, navigate]);

  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      await authApi.updateMe(form);
      toast({ title: "Asosiy ma'lumotlar saqlandi ✓" });
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("phone", profileForm.phone || "");
      fd.append("bio", profileForm.bio || "");

      await authApi.updateProfile(fd);

      toast({ title: "Profil yangilandi ✓" });
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.new_password_confirm) {
      toast({
        title: "Parollar mos emas",
        variant: "destructive",
      });
      return;
    }

    setSavingPw(true);
    try {
      await authApi.changePassword(pwForm);
      toast({ title: "Parol o'zgartirildi ✓" });

      setPwForm({
        old_password: "",
        new_password: "",
        new_password_confirm: "",
      });
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    } finally {
      setSavingPw(false);
    }
  };

  const submitSellerRequest = async () => {
    setSavingSeller(true);

    try {
      await sellerApi.requestCreate({
        shop_name: sellerForm.shop_name,
        description: sellerForm.description,
        phone_number: sellerForm.phone_number,
        address: sellerForm.address,
      });

      toast({ title: "Seller arizasi yuborildi ✅" });

      setSellerForm((prev) => ({
        ...prev,
        shop_name: "",
        description: "",
        address: "",
      }));

      await loadMyRequests();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    } finally {
      setSavingSeller(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User className="h-6 w-6" /> Profilim
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Familiya</Label>
              <Input
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Email: {user?.email}
          </p>

          <Button onClick={saveInfo} disabled={savingInfo}>
            <Save className="w-4 h-4 mr-2" />
            {savingInfo ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
              placeholder="+998901234567"
            />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={profileForm.bio}
              onChange={(e) =>
                setProfileForm({ ...profileForm, bio: e.target.value })
              }
              rows={3}
            />
          </div>

          <Button onClick={saveProfile} disabled={savingProfile}>
            <Save className="w-4 h-4 mr-2" />
            {savingProfile ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller bo'lish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user?.is_seller ? (
            <div className="text-sm">
              Siz allaqachon seller sifatida ro'yxatdan o'tgansiz ✅
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="font-medium">Mening arizalarim</div>

                {loadingReq ? (
                  <p className="text-sm text-muted-foreground">
                    Yuklanmoqda...
                  </p>
                ) : requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Hali ariza topshirmagansiz
                  </p>
                ) : (
                  <div className="space-y-2">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div>
                          <div className="font-medium">{r.shop_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.phone_number}
                          </div>
                        </div>
                        <Badge variant="secondary">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Do'kon nomi</Label>
                  <Input
                    value={sellerForm.shop_name}
                    onChange={(e) =>
                      setSellerForm({
                        ...sellerForm,
                        shop_name: e.target.value,
                      })
                    }
                    placeholder="Masalan: New Shop"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={sellerForm.phone_number}
                    onChange={(e) =>
                      setSellerForm({
                        ...sellerForm,
                        phone_number: e.target.value,
                      })
                    }
                    placeholder="+998901234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Manzil</Label>
                  <Input
                    value={sellerForm.address}
                    onChange={(e) =>
                      setSellerForm({
                        ...sellerForm,
                        address: e.target.value,
                      })
                    }
                    placeholder="Masalan: Qoraqalpog'iston, Amudaryo, Mangit"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tavsif</Label>
                  <Textarea
                    value={sellerForm.description}
                    onChange={(e) =>
                      setSellerForm({
                        ...sellerForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Do'koningiz haqida qisqacha ma'lumot"
                  />
                </div>

                <Button
                  onClick={submitSellerRequest}
                  disabled={
                    savingSeller ||
                    !sellerForm.shop_name ||
                    !sellerForm.phone_number ||
                    !sellerForm.address ||
                    !sellerForm.description
                  }
                >
                  {savingSeller ? "Yuborilyapti..." : "Ariza yuborish"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Parolni o'zgartirish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Eski parol"
            value={pwForm.old_password}
            onChange={(e) =>
              setPwForm({ ...pwForm, old_password: e.target.value })
            }
          />

          <Input
            type="password"
            placeholder="Yangi parol"
            value={pwForm.new_password}
            onChange={(e) =>
              setPwForm({ ...pwForm, new_password: e.target.value })
            }
          />

          <Input
            type="password"
            placeholder="Tasdiqlash"
            value={pwForm.new_password_confirm}
            onChange={(e) =>
              setPwForm({
                ...pwForm,
                new_password_confirm: e.target.value,
              })
            }
          />

          <Button onClick={changePassword} disabled={savingPw}>
            <Lock className="w-4 h-4 mr-2" />
            {savingPw ? "O'zgartirilmoqda..." : "Parolni o'zgartirish"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerProfile;