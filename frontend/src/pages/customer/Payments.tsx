import React, { useEffect, useState } from "react";
import { billingApi, orderApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { Payment, Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, CheckCircle2, XCircle, Clock, Banknote, TrendingUp, CalendarClock } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  succeeded: { label: "Muvaffaqiyatli", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  pending: { label: "Kutilmoqda", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  failed: { label: "Muvaffaqiyatsiz", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const Payments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadPayments();
  }, [user]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await billingApi.list();
      setPayments(res.data?.results || res.data || []);
    } catch {}
    setLoading(false);
  };

  const filtered = tab === "all" ? payments : payments.filter(p => p.status === tab);

  const totalPaid = payments
    .filter(p => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingCount = payments.filter(p => p.status === "pending").length;
  const successCount = payments.filter(p => p.status === "succeeded").length;

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5 md:h-6 md:w-6 text-primary" /> To'lovlarim
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jami to'langan</p>
              <p className="text-lg font-bold">{totalPaid.toLocaleString()} so'm</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Muvaffaqiyatli</p>
              <p className="text-lg font-bold">{successCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kutilmoqda</p>
              <p className="text-lg font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Barchasi ({payments.length})</TabsTrigger>
          <TabsTrigger value="succeeded">Muvaffaqiyatli</TabsTrigger>
          <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
          <TabsTrigger value="failed">Muvaffaqiyatsiz</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Payments Table */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Banknote className="h-16 w-16 mx-auto mb-4 text-muted" />
          <p className="text-muted-foreground">To'lov topilmadi</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="whitespace-nowrap">Buyurtma</TableHead>
                <TableHead className="whitespace-nowrap">Summa</TableHead>
                <TableHead className="whitespace-nowrap">Holat</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Sana</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Stripe ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const cfg = statusConfig[p.status] || statusConfig.pending;
                const Icon = cfg.icon;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">#{p.id}</TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-xs"
                        onClick={() => navigate("/my-orders")}
                      >
                        Buyurtma #{p.order}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-sm">
                      {Number(p.amount).toLocaleString()} so'm
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                      {new Date(p.created_at).toLocaleDateString("uz")}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground hidden md:table-cell max-w-[120px] truncate">
                      {p.stripe_payment_intent}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Payments;
