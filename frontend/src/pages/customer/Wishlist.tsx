import React, { useEffect, useState } from "react";
import { productApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, Trash2 } from "lucide-react";

const API_BASE = "http://localhost:8000";

const Wishlist: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadWishlist();
  }, [user]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      // Backend returns all products; we filter wishlisted on detail
      // Alternative: use a dedicated wishlist endpoint if available
      const res = await productApi.list();
      const all: Product[] = res.data?.results || res.data || [];
      // We'll load each to check is_wishlisted – but this is expensive.
      // Better approach: backend provides a wishlist list endpoint
      // For now show all products marked as wishlisted from list
      setProducts(all.filter(p => p.is_wishlisted));
    } catch {}
    setLoading(false);
  };

  const removeFromWishlist = async (id: number) => {
    try {
      await productApi.removeWishlist(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: "Olib tashlandi" });
    } catch {}
  };

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Yuklanmoqda...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart className="h-6 w-6 text-destructive" /> Sevimlilar
      </h1>

      {products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted" />
          <p className="text-lg mb-2">Sevimlilar ro'yxati bo'sh</p>
          <Button asChild><Link to="/products">Mahsulotlar ko'rish</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <Card key={p.id} className="group overflow-hidden">
              <CardContent className="p-0 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 bg-card/80 h-8 w-8"
                  onClick={() => removeFromWishlist(p.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Link to={`/products/${p.id}`}>
                  <div className="aspect-square bg-muted overflow-hidden">
                    {p.image ? (
                      <img
                        src={p.image.startsWith("http") ? p.image : `${API_BASE}${p.image}`}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        Rasm yo'q
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{p.name}</h3>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs text-muted-foreground">{p.average_rating?.toFixed(1)}</span>
                    </div>
                    <p className="font-bold text-primary">{Number(p.base_price).toLocaleString()} so'm</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
