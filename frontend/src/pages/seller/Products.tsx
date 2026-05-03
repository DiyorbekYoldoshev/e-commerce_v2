import React, { useEffect, useState, useRef } from "react";
import { productApi, categoryApi, variantApi } from "@/lib/api";
import type { Product, Category, ProductVariant } from "@/types";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload, Image, Package, X } from "lucide-react";
import api from "@/lib/api";

const API_BASE = "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttributeOption {
  id: number;
  name: string;
}

interface VariantAttrRow {
  attribute: string;   // attribute ID (string for input)
  value: string;
  attribute_name?: string;
}

interface VariantForm {
  id?: number;
  sku: string;
  price: string;
  stock: string;
  attributes: VariantAttrRow[];
}

// ─── Component ────────────────────────────────────────────────────────────────

const SellerProducts: React.FC = () => {
  const { toast } = useToast();

  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);

  // Product dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState({
    name: "", description: "", base_price: "", category: "", status: "active",
  });
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Variant dialog
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct]       = useState<Product | null>(null);
  const [variants, setVariants]                   = useState<ProductVariant[]>([]);
  const [variantForm, setVariantForm]             = useState<VariantForm>({
    sku: "", price: "", stock: "", attributes: [],
  });
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const [savingVariant, setSavingVariant]   = useState(false);

  // Attributes for current product's category
  const [categoryAttributes, setCategoryAttributes] = useState<AttributeOption[]>([]);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        productApi.myProducts(),
        categoryApi.list(),
      ]);
      setProducts(pRes.data?.results ?? pRes.data ?? []);
      setCategories(cRes.data?.results ?? cRes.data ?? []);
    } catch (err) {
      console.error("Mahsulotlarni yuklashda xatolik:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Kategoriya tanlanganda uning atributlarini yuklash
  const loadCategoryAttributes = async (categoryId: string) => {
    if (!categoryId) { setCategoryAttributes([]); return; }
    try {
      const res = await categoryApi.attributes(Number(categoryId));
      // [{id, name, ...}]
      const attrs: AttributeOption[] = (res.data?.results ?? res.data ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
      }));
      setCategoryAttributes(attrs);
    } catch {
      setCategoryAttributes([]);
    }
  };

  // ── Product handlers ────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description);
      fd.append("base_price", form.base_price);
      fd.append("category", form.category);
      fd.append("status", form.status);
      if (imageFile) fd.append("image", imageFile);

      if (editId) {
        await productApi.update(editId, fd);
        toast({ title: "Yangilandi ✓" });
      } else {
        await productApi.create(fd);
        toast({ title: "Qo'shildi ✓" });
      }
      setDialogOpen(false);
      setEditId(null);
      setImageFile(null);
      setImagePreview(null);
      load();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("O'chirmoqchimisiz?")) return;
    try {
      await productApi.delete(id);
      toast({ title: "O'chirildi" });
      load();
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description,
      base_price: p.base_price,
      category: p.category.toString(),
      status: p.status || "active",
    });
    setEditId(p.id);
    setImageFile(null);
    setImagePreview(
      p.image ? (p.image.startsWith("http") ? p.image : `${API_BASE}${p.image}`) : null
    );
    loadCategoryAttributes(p.category.toString());
    setDialogOpen(true);
  };

  const openNew = () => {
    setForm({ name: "", description: "", base_price: "", category: "", status: "active" });
    setEditId(null);
    setImageFile(null);
    setImagePreview(null);
    setCategoryAttributes([]);
    setDialogOpen(true);
  };

  // ── Variant handlers ────────────────────────────────────────────────────────

  const openVariants = async (p: Product) => {
    setCurrentProduct(p);
    try {
      const res = await productApi.variants(p.id);
      setVariants(res.data ?? []);
    } catch {
      setVariants([]);
    }
    // Mahsulot kategoriyasining atributlarini yukla
    await loadCategoryAttributes(p.category.toString());
    resetVariantForm();
    setVariantDialogOpen(true);
  };

  const resetVariantForm = () => {
    setVariantForm({ sku: "", price: "", stock: "", attributes: [] });
    setEditingVariant(null);
  };

  const saveVariant = async () => {
    if (!currentProduct) return;
    if (!variantForm.sku || !variantForm.price || !variantForm.stock) {
      toast({ title: "SKU, narx va stock to'ldirilishi shart", variant: "destructive" });
      return;
    }

    setSavingVariant(true);
    try {
      const priceNum = parseFloat(variantForm.price.replace(/[^0-9.]/g, ""));
      if (isNaN(priceNum) || priceNum <= 0) {
        toast({ title: "Narx to'g'ri kiritilmagan", variant: "destructive" });
        setSavingVariant(false);
        return;
      }

      const data: any = {
        product: currentProduct.id,
        sku: variantForm.sku.trim(),
        price: priceNum.toFixed(2),
        stock: Number(variantForm.stock),
        attributes: variantForm.attributes
          .filter(a => a.attribute && a.value.trim())
          .map(a => ({ attribute: Number(a.attribute), value: a.value.trim() })),
      };

      if (editingVariant) {
        await variantApi.update(editingVariant, data);
        toast({ title: "Variant yangilandi ✓" });
      } else {
        await variantApi.create(data);
        toast({ title: "Variant qo'shildi ✓" });
      }

      const res = await productApi.variants(currentProduct.id);
      setVariants(res.data ?? []);
      resetVariantForm();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
    setSavingVariant(false);
  };

  const deleteVariant = async (id: number) => {
    if (!confirm("Variantni o'chirmoqchimisiz?")) return;
    try {
      await variantApi.delete(id);
      if (currentProduct) {
        const res = await productApi.variants(currentProduct.id);
        setVariants(res.data ?? []);
      }
      toast({ title: "Variant o'chirildi" });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const editVariant = (v: ProductVariant) => {
    setVariantForm({
      id: v.id,
      sku: v.sku,
      price: v.price,
      stock: v.stock.toString(),
      attributes: (v.attributes ?? []).map((a: any) => ({
        attribute: a.attribute.toString(),
        value: a.value,
        attribute_name: a.attribute_name,
      })),
    });
    setEditingVariant(v.id);
  };

  const addAttributeRow = () => {
    // Birinchi bo'sh atributni avtomatik tanlash
    const firstAttr = categoryAttributes[0];
    setVariantForm(f => ({
      ...f,
      attributes: [
        ...f.attributes,
        { attribute: firstAttr ? firstAttr.id.toString() : "", value: "" },
      ],
    }));
  };

  const removeAttributeRow = (index: number) => {
    setVariantForm(f => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== index),
    }));
  };

  const updateAttr = (index: number, field: "attribute" | "value", val: string) => {
    setVariantForm(f => {
      const attrs = [...f.attributes];
      attrs[index] = { ...attrs[index], [field]: val };
      return { ...f, attributes: attrs };
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mahsulotlarim</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Yangi mahsulot
        </Button>
      </div>

      {/* Products table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rasm</TableHead>
              <TableHead>Nomi</TableHead>
              <TableHead>Narxi</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Reyting</TableHead>
              <TableHead>Variantlar</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Yuklanmoqda...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Mahsulot topilmadi
                </TableCell>
              </TableRow>
            ) : products.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-muted">
                    {p.image ? (
                      <img
                        src={p.image.startsWith("http") ? p.image : `${API_BASE}${p.image}`}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-sm">
                  {Number(p.base_price).toLocaleString()} so'm
                </TableCell>
                <TableCell>{p.total_stock ?? 0}</TableCell>
                <TableCell>⭐ {(p.average_rating ?? 0).toFixed(1)}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => openVariants(p)}>
                    <Package className="h-3.5 w-3.5 mr-1" />
                    {p.variants?.length ?? 0} ta
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Product Create/Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Tahrirlash" : "Yangi mahsulot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Mahsulot rasmi</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-md object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={e => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-6">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Rasm yuklash uchun bosing</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (max 5MB)</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Narx (so'm)</Label>
                <Input
                  type="number"
                  value={form.base_price}
                  onChange={e => setForm({ ...form, base_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kategoriya</Label>
                <Select
                  value={form.category}
                  onValueChange={v => {
                    setForm({ ...form, category: v });
                    loadCategoryAttributes(v);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Faol</SelectItem>
                  <SelectItem value="archived">Arxiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editId ? "Saqlash" : "Qo'shish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Variant Management Dialog ──────────────────────────────────────── */}
      <Dialog open={variantDialogOpen} onOpenChange={v => { setVariantDialogOpen(v); if (!v) resetVariantForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variantlar — {currentProduct?.name}</DialogTitle>
          </DialogHeader>

          {/* Existing variants */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Mavjud variantlar</p>
              <div className="space-y-2">
                {variants.map(v => (
                  <Card key={v.id} className={editingVariant === v.id ? "border-primary" : ""}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
                            <Badge variant="outline" className="text-xs">
                              {Number(v.price).toLocaleString()} so'm
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Stock: {v.stock}
                            </Badge>
                          </div>
                          {/* Atributlar */}
                          {v.attributes && v.attributes.length > 0 ? (
                            <div className="flex gap-1.5 flex-wrap">
                              {v.attributes.map((a: any) => (
                                <Badge key={a.id} className="text-xs bg-primary/10 text-primary border-0">
                                  {a.attribute_name}: {a.value}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Atributlar yo'q
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => editVariant(v)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteVariant(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Add/Edit variant form */}
          <div className="space-y-4">
            <p className="text-sm font-semibold">
              {editingVariant ? "Variantni tahrirlash" : "Yangi variant qo'shish"}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">SKU *</Label>
                <Input
                  value={variantForm.sku}
                  onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Narx (so'm) *</Label>
                <Input
                  type="number"
                  value={variantForm.price}
                  onChange={e => setVariantForm({ ...variantForm, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock *</Label>
                <Input
                  type="number"
                  value={variantForm.stock}
                  onChange={e => setVariantForm({ ...variantForm, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Attributes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Xususiyatlar
                  {categoryAttributes.length === 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      (bu kategoriyada atribut yo'q)
                    </span>
                  )}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addAttributeRow}
                  disabled={categoryAttributes.length === 0}
                  type="button"
                >
                  <Plus className="h-3 w-3 mr-1" /> Qo'shish
                </Button>
              </div>

              {variantForm.attributes.map((attr, i) => (
                <div key={i} className="flex gap-2 items-end">
                  {/* Atribut nomi — Select */}
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Xususiyat</Label>
                    <Select
                      value={attr.attribute}
                      onValueChange={v => updateAttr(i, "attribute", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryAttributes.map(a => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Qiymat */}
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Qiymat</Label>
                    <Input
                      value={attr.value}
                      onChange={e => updateAttr(i, "value", e.target.value)}
                      placeholder={
                        categoryAttributes.find(a => a.id.toString() === attr.attribute)
                          ? `Masalan: Qizil`
                          : "Qiymat"
                      }
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeAttributeRow(i)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={saveVariant}
                disabled={savingVariant}
                className="flex-1"
              >
                {savingVariant
                  ? "Saqlanmoqda..."
                  : editingVariant ? "Yangilash" : "Qo'shish"}
              </Button>
              {editingVariant && (
                <Button variant="outline" onClick={resetVariantForm}>
                  Bekor qilish
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerProducts;