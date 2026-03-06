import React, { useEffect, useState } from "react";
import { categoryApi } from "@/lib/api";
import type { Category } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";

const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "main", parent: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await categoryApi.list();
      setCategories(res.data?.results || res.data || []);
    } catch { setCategories([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const mainCategories = categories.filter((c) => c.type === "main");

  const handleSave = async () => {
    try {
      const data: any = { name: form.name, type: form.type };
      if (form.type === "sub" && form.parent) data.parent = Number(form.parent);

      if (editId) {
        await categoryApi.update(editId, data);
        toast({ title: "Yangilandi" });
      } else {
        await categoryApi.create(data);
        toast({ title: "Qo'shildi" });
      }
      setDialogOpen(false);
      setForm({ name: "", type: "main", parent: "" });
      setEditId(null);
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", description: JSON.stringify(err.response?.data), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("O'chirishni xohlaysizmi?")) return;
    try {
      await categoryApi.delete(id);
      toast({ title: "O'chirildi" });
      load();
    } catch (err: any) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, type: cat.type, parent: cat.parent?.toString() || "" });
    setEditId(cat.id);
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kategoriyalar</h1>
        <Button onClick={() => { setForm({ name: "", type: "main", parent: "" }); setEditId(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Qo'shish
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nomi</TableHead>
              <TableHead>Turi</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Quyi bo'limlar</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Yuklanmoqda...</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Kategoriya topilmadi</TableCell></TableRow>
            ) : categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.id}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant={c.type === "main" ? "default" : "secondary"}>
                    {c.type === "main" ? "Asosiy" : "Quyi"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.slug}</TableCell>
                <TableCell>{c.children?.length || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Tahrirlash" : "Yangi kategoriya"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Asosiy</SelectItem>
                  <SelectItem value="sub">Quyi bo'lim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "sub" && (
              <div className="space-y-2">
                <Label>Parent kategoriya</Label>
                <Select value={form.parent} onValueChange={(v) => setForm({ ...form, parent: v })}>
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {mainCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSave} className="w-full">{editId ? "Saqlash" : "Qo'shish"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
