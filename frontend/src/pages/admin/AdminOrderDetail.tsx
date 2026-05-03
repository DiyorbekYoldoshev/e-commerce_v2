import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Banknote } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  confirmed: "Tasdiqlangan",
  processing: "Tayyorlanmoqda",
  shipped: "Jo'natildi",
  delivered: "Topshirildi",
  cancelled: "Bekor qilingan",
};

const paymentLabels: Record<string, string> = {
  unpaid: "To'lanmagan",
  paid: "To'langan",
  partial: "Qisman",
};

const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await adminApi.orders.detail(Number(id));
      setOrder(res.data);
    } catch {
      toast({ title: "Buyurtma topilmadi", variant: "destructive" });
      navigate("/admin/orders");
    }
    setLoading(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await adminApi.orders.setStatus(order.id, status);
      toast({ title: "Status yangilandi" });
      loadOrder();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || "Status o'zgarmadi",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const confirmCashPayment = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      // Naqd to'lovni tasdiqlash — payment_status ni "paid" ga o'zgartirish
      await adminApi.orders.confirmCashPayment(order.id);
      toast({ title: "Naqd to'lov tasdiqlandi" });
      loadOrder();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || "Tasdiqlab bo'lmadi",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="text-center py-20">Yuklanmoqda...</div>;
  if (!order) return <div className="text-center py-20">Buyurtma topilmadi</div>;

  const isCash = !order.installment_plan;
  const isDelivered = order.status_choices === "delivered";
  const isUnpaid = order.payment_status === "unpaid";
  const canConfirmCash = isCash && isDelivered && isUnpaid;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Buyurtma #{order.id}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left - Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buyurtma ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Mijoz:</span>
              <span className="font-medium">{order.user_email || "—"}</span>

              <span className="text-muted-foreground">Telefon:</span>
              <span>{order.phone}</span>

              <span className="text-muted-foreground">Manzil:</span>
              <span>{order.address}</span>

              <span className="text-muted-foreground">Jami summa:</span>
              <span className="font-bold text-primary">
                {Number(order.payable_amount).toLocaleString()} so'm
              </span>

              <span className="text-muted-foreground">To'lov turi:</span>
              <span>
                {order.installment_plan
                  ? `Nasiya (${order.installment_plan.months} oy)`
                  : "Naqd to'lov"}
              </span>

              <span className="text-muted-foreground">Sana:</span>
              <span>{new Date(order.created_at).toLocaleString("uz")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right - Status Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status boshqaruvi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Buyurtma holati:</p>
              <Select
                value={order.status_choices}
                onValueChange={handleStatusChange}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">To'lov holati:</p>
              <Badge variant="outline" className="text-sm">
                {paymentLabels[order.payment_status]}
              </Badge>
            </div>

            {/* Naqd to'lovni tasdiqlash tugmasi */}
            {canConfirmCash && (
              <div className="pt-4 border-t">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-3">
                  <div className="flex items-start gap-2 text-sm text-green-800">
                    <Banknote className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Naqd to'lovni tasdiqlang</p>
                      <p className="text-xs">
                        Mahsulot topshirildi. Kuryer naqd pul qabul qilganini tasdiqlang.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={confirmCashPayment}
                  disabled={updating}
                  className="w-full gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {updating ? "Tasdiqlanmoqda..." : "Naqd to'lovni tasdiqlash"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      {order.items && order.items.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mahsulot</TableHead>
                  <TableHead className="text-right">Narxi</TableHead>
                  <TableHead className="text-right">Soni</TableHead>
                  <TableHead className="text-right">Jami</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.variant_sku})
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(item.unit_price).toLocaleString()} so'm
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {Number(item.subtotal).toLocaleString()} so'm
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminOrderDetail;