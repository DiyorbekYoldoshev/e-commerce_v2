import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { User } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trash2, Lock, Unlock } from "lucide-react";

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

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

  const handleDeleteOrBlock = async (user: User) => {
    try {
      if (user.is_active) {
        await adminApi.users.block(user.id); //
      } else {
        await adminApi.users.deleteUser(user.id); //
      }
      loadUsers(tab);
    } catch (err) {
    console.error(err);
    }
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
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Ism</TableHead>
              <TableHead className="hidden md:table-cell">Jins</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead className="hidden sm:table-cell">Staff</TableHead>
              <TableHead>Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Yuklanmoqda...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Ma'lumot topilmadi
                </TableCell>
              </TableRow>
            ) : (
              users.map(u => (
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
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteOrBlock(u)}>
                      {u.is_active ? <Lock className="h-4 w-4 text-red-600" /> : <Trash2 className="h-4 w-4 text-red-600" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;