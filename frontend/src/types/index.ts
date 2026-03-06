export interface User {
  id: number;
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  slug: string;
  gender: "male" | "female" | "other";
  is_seller: boolean;
  profile: Profile | null;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface Profile {
  phone: string | null;
  bio: string | null;
  avatar: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  type: "main" | "sub";
  parent?: number | null;
  children?: Category[];
  is_active?: boolean;
  ancestors?: Category[];
}

export interface Attribute {
  id: number;
  name: string;
  category: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  base_price: string;
  total_stock: number;
  image: string | null;
  category: number;
  category_name?: string;
  seller: number;
  seller_name?: string;
  average_rating: number;
  reviews_count: number;
  variants?: ProductVariant[];
  reviews?: Review[];
  is_wishlisted?: boolean;
  created_at: string;
  updated_at: string;
  status?: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  price: string;
  stock: number;
  attributes?: VariantAttribute[];
}

export interface VariantAttribute {
  id: number;
  attribute: number;
  attribute_name: string;
  variant: number;
  value: string;
}

export interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Order {
  id: number;
  status_choices: string;
  payment_status: string;
  total_amount: string;
  discount_amount: string;
  payable_amount: string;
  total_quantity?: number;
  items_count?: number;
  items?: OrderItem[];
  address?: string;
  phone?: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  variant: number;
  variant_sku: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface Seller {
  id: number;
  user_email: string;
  shop_name: string;
  description: string;
  phone_number: string;
  address: string;
  status?: { is_active: boolean; is_blocked: boolean; is_verified: boolean };
  rating: number;
  is_active: boolean;
  is_blocked: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface SellerRequest {
  id: number;
  user_email?: string;
  user?: string;
  shop_name: string;
  description: string;
  phone_number: string;
  address: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface SellerStats {
  product_count: number;
  orders_count: number;
  revenue: string;
  avg_rating: number;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface WishlistItem {
  id: number;
  product_name: string;
  product_price: string;
  created_at: string;
  product?: Product;
}
