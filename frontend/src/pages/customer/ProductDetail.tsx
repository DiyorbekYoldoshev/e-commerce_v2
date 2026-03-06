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

  // Review form
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productApi.detail(Number(id)).then(res => {
      const p = res.data;
      setProduct(p);
      setWishlisted(!!p.is_wishlisted);
      if (p.variants?.length) setSelectedVariant(p.variants[0]);
    }).catch(() => navigate("/products")).finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) {
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
      // Reload product
      const res = await productApi.detail(product.id);
      setProduct(res.data);
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
  const currentStock = selectedVariant ? selectedVariant.stock : product.total_stock;

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

          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= Math.round(product.average_rating) ? "fill-warning text-warning" : "text-muted"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {product.average_rating?.toFixed(1)} ({product.reviews_count} ta sharh)
            </span>
          </div>

          <p className="text-3xl font-bold text-primary">
            {Number(currentPrice).toLocaleString()} so'm
          </p>

          <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Variant tanlang</Label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <Button
                    key={v.id}
                    variant={selectedVariant?.id === v.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                    disabled={v.stock === 0}
                  >
                    {v.sku}
                    {v.attributes?.map(a => ` - ${a.value}`).join("")}
                    {v.stock === 0 && " (tugagan)"}
                  </Button>
                ))}
              </div>
              {selectedVariant?.attributes && selectedVariant.attributes.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  {selectedVariant.attributes.map(a => (
                    <Badge key={a.id} variant="outline">{a.attribute_name}: {a.value}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md">
              <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              <Package className="inline h-4 w-4 mr-1" />
              {currentStock} dona mavjud
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
        <h2 className="text-xl font-bold">Sharhlar ({product.reviews_count})</h2>

        {/* Add review */}
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

        {/* Reviews list */}
        {product.reviews && product.reviews.length > 0 ? (
          <div className="space-y-3">
            {product.reviews.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.user_name}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= r.rating ? "fill-warning text-warning" : "text-muted"}`}
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
