import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, UserPlus } from "lucide-react";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    email: "", first_name: "", last_name: "",
    password: "", password_confirm: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      toast({ title: "Parollar mos emas", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await authApi.register(form);
      toast({ title: "Ro'yxatdan o'tdingiz! Endi kiring." });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Store className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Ro'yxatdan o'tish</CardTitle>
          <CardDescription>Yangi hisob yarating</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ism</Label>
                <Input
                  value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Familiya</Label>
                <Input
                  value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Parol</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Parolni tasdiqlang</Label>
              <Input
                type="password"
                value={form.password_confirm}
                onChange={e => setForm({ ...form, password_confirm: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Hisobingiz bormi?{" "}
              <Link to="/login" className="text-primary hover:underline">Kirish</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
