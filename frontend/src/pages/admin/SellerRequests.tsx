import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { SellerRequest } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-600",
  approved: "bg-green-600",
  rejected: "bg-red-600",
};

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
};

const AdminSellerRequests: React.FC = () => {
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SellerRequest | null>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.sellerRequests.list();
      setRequests(res.data?.results || res.data || []);
    } catch { setRequests([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (action: "approve" | "reject") => {
    if (!selected) return;
    try {
      await adminApi.sellerRequests.action(selected.id, {
        action,
        reason: action === "reject" ? reason : undefined,
      });
      toast({ title: action === "approve" ? "Tasdiqlandi!" : "Rad etildi!" });
      setSelected(null);
      setReason("");
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: JSON.stringify(err.response?.data), variant: "destructive" });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Seller arizalari</h1>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Do'kon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Ariza topilmadi</TableCell></TableRow>
            ) : requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium">{r.shop_name}</TableCell>
                <TableCell>{r.user_email || r.user}</TableCell>
                <TableCell>{r.phone_number}</TableCell>
                <TableCell>
                  <Badge className={`${statusColors[r.status]} text-white`}>
                    {statusLabels[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("uz")}
                </TableCell>
                <TableCell>
                  {r.status === "pending" && (
                    <Button variant="ghost" size="sm" onClick={() => { setSelected(r); setReason(""); }}>
                      Ko'rish
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ariza: {selected?.shop_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm space-y-2">
                <p><span className="text-muted-foreground">Email:</span> {selected.user_email || selected.user}</p>
                <p><span className="text-muted-foreground">Telefon:</span> {selected.phone_number}</p>
                <p><span className="text-muted-foreground">Manzil:</span> {selected.address}</p>
                <p><span className="text-muted-foreground">Tavsif:</span> {selected.description}</p>
              </div>

              <div>
                <Textarea
                  placeholder="Rad etish sababi (ixtiyoriy)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => handleAction("approve")} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-2" /> Tasdiqlash
                </Button>
                <Button onClick={() => handleAction("reject")} variant="destructive" className="flex-1">
                  <X className="h-4 w-4 mr-2" /> Rad etish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSellerRequests;
