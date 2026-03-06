import React from "react";
import { useCart } from "@/contexts/CartContext";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

const API_BASE = "http://localhost:8000";

const Cart: React.FC = () => {
  const { items, updateQuantity, removeItem, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Savat bo'sh</h1>
        <p className="text-muted-foreground mb-6">Mahsulotlar qo'shib xarid qiling</p>
        <Button asChild>
          <Link to="/products">Xarid qilish</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Savat</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <Card key={item.variant.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0">
                    {item.product.image ? (
                      <img
                        src={item.product.image.startsWith("http") ? item.product.image : `${API_BASE}${item.product.image}`}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        Rasm yo'q
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.product.id}`} className="font-medium text-sm hover:text-primary line-clamp-1">
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SKU: {item.variant.sku}
                      {item.variant.attributes?.map(a => ` | ${a.attribute_name}: ${a.value}`).join("")}
                    </p>
                    <p className="font-semibold text-primary mt-1">
                      {Number(item.variant.price).toLocaleString()} so'm
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.variant.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" size="sm" onClick={clearCart} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Savatni tozalash
          </Button>
        </div>

        {/* Summary */}
        <Card className="h-fit sticky top-20">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold">Buyurtma xulosasi</h3>
            <div className="space-y-2 text-sm">
              {items.map(i => (
                <div key={i.variant.id} className="flex justify-between text-muted-foreground">
                  <span className="truncate max-w-[60%]">{i.product.name} x{i.quantity}</span>
                  <span>{(Number(i.variant.price) * i.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Jami:</span>
              <span className="text-primary">{totalAmount.toLocaleString()} so'm</span>
            </div>
            <Button className="w-full" size="lg" onClick={() => navigate("/checkout")}>
              Buyurtma berish <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cart;
