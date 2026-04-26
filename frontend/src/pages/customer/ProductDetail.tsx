import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productApi } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductVariant } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star, Heart, ShoppingCart, Minus, Plus, ArrowLeft, Package, Truck,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProduct = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await productApi.detail(Number(id));
      const p = res.data;
      setProduct(p);
      setWishlisted(!!p.is_wishlisted);
      // Birinchi stock bor variantni tanlash
      const firstAvailable = p.variants?.find((v: ProductVariant) => v.stock > 0) ?? p.variants?.[0] ?? null;
      setSelectedVariant(firstAvailable);
    } catch {
      navigate("/products");
    }
    setLoading(false);
  };

  useEffect(() => { loadProduct(); }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (product.variants?.length > 0 && !selectedVariant) {
      toast({ title: "Variant tanlang", variant: "destructive" });
      return;
    }
    addItem(product, selectedVariant, quantity);
    toast({ title: "Savatga qo'shildi ✓" });
  };

  const toggleWishlist = async () => {
    if (!user) { navigate("/login"); return; }
    if (!product) return;
    try {
      if (wishlisted) {
        await productApi.removeWishlist(product.id);
        setWishlisted(false);
        toast({ title: "Sevimlilardan olib tashlandi" });
      } else {
        await productApi.addWishlist(product.id);
        setWishlisted(true);
        toast({ title: "Sevimlilarga qo'shildi ❤️" });
      }
    } catch {}
  };

  const handleReview = async () => {
    if (!user) { navigate("/login"); return; }
    if (!product) return;
    setSubmittingReview(true);
    try {
      await productApi.addReview(product.id, {
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      toast({ title: "Bahoingiz qabul qilindi ✓" });
      setReviewComment("");
      loadProduct();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.response?.data?.detail || JSON.stringify(err.response?.data),
        variant: "destructive",
      });
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-lg" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-10 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : product.base_price;
  const currentStock = selectedVariant ? selectedVariant.stock : (product.total_stock ?? 0);
  const hasVariants = product.variants && product.variants.length > 0;

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Orqaga
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
          {product.image ? (
            <img
              src={product.image.startsWith("http") ? product.image : `${API_BASE}${product.image}`}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Rasm yo'q
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            {product.category_name && (
              <Badge variant="secondary" className="mb-2">{product.category_name}</Badge>
            )}
            <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
            {product.seller_name && (
              <p className="text-sm text-muted-foreground mt-1">Sotuvchi: {product.seller_name}</p>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= Math.round(product.average_rating ?? 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {(product.average_rating ?? 0).toFixed(1)} ({product.reviews_count ?? 0} ta sharh)
            </span>
          </div>

          <p className="text-3xl font-bold text-primary">
            {Number(currentPrice).toLocaleString()} so'm
          </p>

          <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>

          {/* Variants */}
          {hasVariants && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Variant tanlang</Label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v: ProductVariant) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const outOfStock = v.stock === 0;

                  // Atributlardan label yasash (rang, o'lcham va h.k.)
                  const attrLabel = v.attributes && v.attributes.length > 0
                    ? v.attributes.map((a: any) => `${a.attribute_name}: ${a.value}`).join(", ")
                    : v.sku;

                  return (
                    <Button
                      key={v.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                      disabled={outOfStock}
                      className="flex flex-col items-start h-auto py-2 px-3 text-left"
                    >
                      <span className="font-mono text-xs opacity-60">{v.sku}</span>
                      <span className="text-sm">{attrLabel}</span>
                      <span className={`text-xs mt-0.5 ${outOfStock ? "text-destructive" : "opacity-70"}`}>
                        {outOfStock
                          ? "Tugagan"
                          : `${Number(v.price).toLocaleString()} so'm · ${v.stock} dona`}
                      </span>
                    </Button>
                  );
                })}
              </div>

              {/* Tanlangan variant atributlari */}
              {selectedVariant?.attributes && selectedVariant.attributes.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {selectedVariant.attributes.map((a: any) => (
                    <Badge key={a.id} variant="outline">
                      {a.attribute_name}: {a.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quantity & stock */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md">
              <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                disabled={quantity >= currentStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-4 w-4" />
              {currentStock > 0 ? `${currentStock} dona mavjud` : "Stokda yo'q"}
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={currentStock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {currentStock === 0 ? "Tugagan" : "Savatga qo'shish"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={toggleWishlist}
              className={wishlisted ? "text-destructive border-destructive/50" : ""}
            >
              <Heart className={`h-5 w-5 ${wishlisted ? "fill-destructive" : ""}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>1-3 kun ichida yetkazib beriladi</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Reviews */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold">Sharhlar ({product.reviews_count ?? 0})</h2>

        {user && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Sharh qoldiring</h3>
              <div className="flex items-center gap-3">
                <Label className="text-sm">Baho:</Label>
                <Select value={reviewRating} onValueChange={setReviewRating}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map(r => (
                      <SelectItem key={r} value={r.toString()}>⭐ {r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Izoh..."
                rows={3}
              />
              <Button size="sm" onClick={handleReview} disabled={submittingReview}>
                {submittingReview ? "Yuborilmoqda..." : "Yuborish"}
              </Button>
            </CardContent>
          </Card>
        )}

        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-3">
            {product.reviews.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.user_name}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= r.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("uz")}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Hali sharh yo'q</p>
        )}
      </section>
    </div>
  );
};

export default ProductDetail;