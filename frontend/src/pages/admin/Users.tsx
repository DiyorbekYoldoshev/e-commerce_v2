import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import api from "@/lib/api";
import type { User } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Ban, Trash2, ShieldCheck, ShieldOff, Eye, UserX, AlertTriangle } from "lucide-react";

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "block" | "unblock" | "delete";
    user: User | null;
  }>({ open: false, type: "block", user: null });
  const { toast } = useToast();

  const loadUsers = async (filter: string) => {
    setLoading(true);
    try {
      let res;
      switch (filter) {
        case "all": res = await adminApi.users.all(); break;
        case "blocked": res = await adminApi.users.blocked(); break;
        case "deleted": res = await adminApi.users.deleted(); break;
        case "sellers": res = await adminApi.users.sellers(); break;
        default: res = await adminApi.users.active();
      }
      setUsers(res.data?.results || res.data || []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(tab); }, [tab]);

  const handleBlock = async (user: User) => {
    try {
      await api.post(`/admin/users/${user.id}/block/`);
      toast({ title: `${user.email} bloklandi` });
      loadUsers(tab);
      setConfirmDialog({ open: false, type: "block", user: null });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.response?.data?.detail || "Bloklab bo'lmadi", variant: "destructive" });
    }
  };

  const handleUnblock = async (user: User) => {
    try {
      await api.post(`/admin/users/${user.id}/unblock/`);
      toast({ title: `${user.email} blokdan chiqarildi` });
      loadUsers(tab);
      setConfirmDialog({ open: false, type: "unblock", user: null });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.response?.data?.detail || "Blokdan chiqarib bo'lmadi", variant: "destructive" });
    }
  };

  const handlePermanentDelete = async (user: User) => {
    try {
      await api.delete(`/admin/users/${user.id}/permanent-delete/`);
      toast({ title: `${user.email} butunlay o'chirildi` });
      loadUsers(tab);
      setConfirmDialog({ open: false, type: "delete", user: null });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.response?.data?.detail || "O'chirib bo'lmadi", variant: "destructive" });
    }
  };

  const openConfirm = (type: "block" | "unblock" | "delete", user: User) => {
    setConfirmDialog({ open: true, type, user });
  };

  const confirmMessages = {
    block: { title: "Foydalanuvchini bloklash", desc: "Bloklangan foydalanuvchi tizimga kira olmaydi.", action: "Bloklash", variant: "destructive" as const },
    unblock: { title: "Blokdan chiqarish", desc: "Foydalanuvchi tizimga qayta kira oladi.", action: "Blokdan chiqarish", variant: "default" as const },
    delete: { title: "Butunlay o'chirish", desc: "Bu amalni qaytarib bo'lmaydi! Foydalanuvchi va barcha ma'lumotlari o'chib ketadi.", action: "O'chirish", variant: "destructive" as const },
  };

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Foydalanuvchilar</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="active" className="text-xs md:text-sm">Faol</TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs md:text-sm">Bloklangan</TabsTrigger>
          <TabsTrigger value="deleted" className="text-xs md:text-sm">O'chirilgan</TabsTrigger>
          <TabsTrigger value="sellers" className="text-xs md:text-sm">Sellerlar</TabsTrigger>
          <TabsTrigger value="all" className="text-xs md:text-sm">Barchasi</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">ID</TableHead>
              <TableHead className="whitespace-nowrap">Email</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Ism</TableHead>
              <TableHead className="whitespace-nowrap hidden md:table-cell">Jins</TableHead>
              <TableHead className="whitespace-nowrap">Seller</TableHead>
              <TableHead className="whitespace-nowrap hidden sm:table-cell">Staff</TableHead>
              <TableHead className="whitespace-nowrap text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Ma'lumot topilmadi</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.id}</TableCell>
                <TableCell className="text-xs md:text-sm max-w-[150px] truncate">{u.email}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{u.full_name || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{u.gender || "—"}</TableCell>
                <TableCell>
                  {u.is_seller ? <Badge className="bg-green-600 text-white text-xs">Ha</Badge> : <Badge variant="secondary" className="text-xs">Yo'q</Badge>}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {u.is_staff ? <Badge className="text-xs">Staff</Badge> : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {tab === "active" && !u.is_superuser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Bloklash"
                        onClick={() => openConfirm("block", u)}
                      >
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    {tab === "blocked" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Blokdan chiqarish"
                          onClick={() => openConfirm("unblock", u)}
                        >
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Butunlay o'chirish"
                          onClick={() => openConfirm("delete", u)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    {tab === "deleted" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Butunlay o'chirish"
                        onClick={() => openConfirm("delete", u)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => !o && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmMessages[confirmDialog.type]?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {confirmMessages[confirmDialog.type]?.desc}
            </p>
            {confirmDialog.user && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><span className="text-muted-foreground">Email:</span> {confirmDialog.user.email}</p>
                <p><span className="text-muted-foreground">Ism:</span> {confirmDialog.user.full_name || "—"}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Bekor qilish
            </Button>
            <Button
              variant={confirmMessages[confirmDialog.type]?.variant || "default"}
              onClick={() => {
                if (!confirmDialog.user) return;
                if (confirmDialog.type === "block") handleBlock(confirmDialog.user);
                else if (confirmDialog.type === "unblock") handleUnblock(confirmDialog.user);
                else handlePermanentDelete(confirmDialog.user);
              }}
            >
              {confirmMessages[confirmDialog.type]?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
