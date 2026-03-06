import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { User } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      setUsers(res.data || []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  useEffect(() => { loadUsers(tab); }, [tab]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Foydalanuvchilar</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Faol</TabsTrigger>
          <TabsTrigger value="blocked">Bloklangan</TabsTrigger>
          <TabsTrigger value="deleted">O'chirilgan</TabsTrigger>
          <TabsTrigger value="sellers">Sellerlar</TabsTrigger>
          <TabsTrigger value="all">Barchasi</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ism</TableHead>
              <TableHead>Jins</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Staff</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Ma'lumot topilmadi</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-xs">{u.id}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.full_name || "—"}</TableCell>
                <TableCell>{u.gender || "—"}</TableCell>
                <TableCell>
                  {u.is_seller ? <Badge className="bg-green-600 text-white">Ha</Badge> : <Badge variant="secondary">Yo'q</Badge>}
                </TableCell>
                <TableCell>
                  {u.is_staff ? <Badge>Staff</Badge> : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
