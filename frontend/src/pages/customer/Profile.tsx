import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { User, Lock, Save } from "lucide-react";

const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [profileForm, setProfileForm] = useState({ phone: "", bio: "" });
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", new_password_confirm: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    setForm({ first_name: user.first_name || "", last_name: user.last_name || "" });
    if (user.profile) {
      setProfileForm({ phone: user.profile.phone || "", bio: user.profile.bio || "" });
    }
  }, [user]);

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
      if (profileForm.bio) fd.append("bio", profileForm.bio);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User className="h-6 w-6" /> Profilim
      </h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Asosiy ma'lumotlar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Familiya</Label>
              <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
          <Button onClick={saveInfo} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" /> Saqlash
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+998..." />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })} rows={3} />
          </div>
          <Button onClick={saveProfile} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" /> Saqlash
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lock className="h-4 w-4" /> Parolni o'zgartirish</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Joriy parol</Label>
            <Input type="password" value={pwForm.old_password} onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yangi parol</Label>
              <Input type="password" value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tasdiqlash</Label>
              <Input type="password" value={pwForm.new_password_confirm} onChange={e => setPwForm({ ...pwForm, new_password_confirm: e.target.value })} />
            </div>
          </div>
          <Button onClick={changePassword} disabled={saving} size="sm">
            <Lock className="h-4 w-4 mr-1" /> O'zgartirish
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerProfile;
