import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";


const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

/* 🔐 REQUEST INTERCEPTOR — JWT */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* 🔄 RESPONSE INTERCEPTOR — refresh token (queued) */
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];
const processQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/token/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) return reject(error);
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        isRefreshing = false;
        localStorage.clear();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE}/users/auth/token/refresh/`, { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("access_token", newAccess);
        processQueue(newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processQueue(null);
        localStorage.clear();
        if (typeof window !== "undefined") window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* 🔑 AUTH */
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/users/auth/login/", data),
  getToken: (data: { email: string; password: string }) =>
    api.post("/users/auth/token/", data),
  refreshToken: (refresh: string) =>
    api.post("/users/auth/token/refresh/", { refresh }),
  register: (data: {
    email: string; first_name: string; last_name: string;
    password: string; password_confirm: string;
  }) => api.post("/users/auth/register/", data),
  me: () => api.get("/users/me/"),
  updateMe: (data: any) => api.patch("/users/me/update/", data),
  changePassword: (data: {
    old_password: string; new_password: string; new_password_confirm: string;
  }) => api.post("/users/auth/password/change/", data),
  profile: () => api.get("/users/profile/"),
  updateProfile: (data: FormData) =>
    api.patch("/users/profile/update/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

/* 📂 CATEGORY */
export const categoryApi = {
  list: () => api.get("/categories/category/"),
  detail: (id: number) => api.get(`/categories/category/${id}/`),
  create: (data: any) => api.post("/categories/category/", data),
  update: (id: number, data: any) => api.patch(`/categories/category/${id}/`, data),
  delete: (id: number) => api.delete(`/categories/category/${id}/`),
  subcategories: (id: number) => api.get(`/categories/category/${id}/subcategories/`),
  attributes: (id: number) => api.get(`/categories/category/${id}/attributes/`),
  addAttribute: (id: number, data: { name?: string; attribute_id?: number }) =>
    api.post(`/categories/category/${id}/attributes/add/`, data),
  removeAttribute: (id: number, attrId: number) =>
    api.delete(`/categories/category/${id}/attributes/remove/${attrId}/`),
};

/* 🛍 PRODUCT  (route: /product/product/) */
export const productApi = {
  list: (params?: any) => api.get("/product/product/", { params }),
  detail: (id: number) => api.get(`/product/product/${id}/`),
  create: (data: FormData) =>
    api.post("/product/product/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: number, data: FormData) =>
    api.patch(`/product/product/${id}/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id: number) => api.delete(`/product/product/${id}/`),
  variants: (id: number) => api.get(`/product/product/${id}/variants/`),
  wishlist: () => api.get(`/product/product/wishlist/`),
  addWishlist: (id: number) => api.post(`/product/product/${id}/wishlist/`),
  removeWishlist: (id: number) => api.delete(`/product/product/${id}/wishlist/`),
  addReview: (id: number, data: { rating: number; comment: string }) =>
    api.post(`/product/product/${id}/reviews/`, data),
  myProducts: () => api.get("/product/product/my-products/"),
};

/* 🔀 PRODUCT VARIANT */
export const variantApi = {
  list: (params?: any) => api.get("/product/product-variant/", { params }),
  detail: (id: number) => api.get(`/product/product-variant/${id}/`),
  create: (data: any) => api.post("/product/product-variant/", data),
  update: (id: number, data: any) => api.patch(`/product/product-variant/${id}/`, data),
  delete: (id: number) => api.delete(`/product/product-variant/${id}/`),
};

/* 📦 ORDERS */
export const orderApi = {
  list: () => api.get("/orders/orders/"),
  detail: (id: number) => api.get(`/orders/orders/${id}/`),
  create: (data: any) => api.post("/orders/orders/", data),
  cancel: (id: number) => api.post(`/orders/orders/${id}/cancel/`),
  setStatus: (id: number, status: string) =>
    api.post(`/orders/orders/${id}/set-status/`, { status }),
};

/* 💳 BILLING / PAYMENTS  (ichki Card + Balans tizimi) */
export const billingApi = {
  // Kartalar
  listCards: () => api.get("/pay/cards/"),
  addCard: (data: { card_number: string; expiration_date: string }) =>
    api.post("/pay/cards/", data),
  deleteCard: (id: number) => api.delete(`/pay/cards/${id}/`),

  // To'lov bajarish (oddiy yoki nasiya oyligi)
  processPayment: (data: {
    order_id: number;
    card_id: number;
    installment_id?: number;
  }) => api.post("/pay/process-payment/", data),

  // To'lov tarixi
  list: () => api.get("/pay/history/"),

  // Mijoz balansi
  balance: () => api.get("/pay/balance/"),
  topUp: (data: { card_id: number; amount: number }) =>
    api.post("/pay/balance/topup/", data),

  calculateInstallment: (totalAmount: string | number, months: number) => {
    const totalCents = Math.round(parseFloat(String(totalAmount)) * 100);
    const baseCents = Math.floor(totalCents / months);
    const remainder = totalCents - baseCents * months;
    const installments: { month: number; amount: string }[] = [];
    for (let i = 1; i <= months; i++) {
      const cents = i === months ? baseCents + remainder : baseCents;
      installments.push({ month: i, amount: (cents / 100).toFixed(2) });
    }
    return installments;
  },
};

/* 🧑‍💼 SELLER */
export const sellerApi = {
  me: () => api.get("/sellers/sellers/me/"),
  updateMe: (data: any) => api.patch("/sellers/sellers/me/", data),
  myStats: () => api.get("/sellers/sellers/me/stats/"),
  requestCreate: (data: any) => api.post("/sellers/seller-requests/", data),
  myRequests: () => api.get("/sellers/seller-requests/me/"),
};

/* 🛠 ADMIN */
export const adminApi = {
  users: {
    all: () => api.get("/admin/users/all/"),
    active: () => api.get("/admin/users/active/"),
    blocked: () => api.get("/admin/users/blocked/"),
    deleted: () => api.get("/admin/users/deleted/"),
    sellers: () => api.get("/admin/users/sellers/"),
    detail: (id: number) => api.get(`/admin/users/${id}/`),
    block: (id: number) => api.patch(`/admin/users/${id}/block/`),
    unblock: (id: number) => api.patch(`/admin/users/${id}/unblock/`),
    delete: (id: number) => api.delete(`/admin/users/${id}/delete/`),
    forceDelete: (id: number) => api.delete(`/admin/users/${id}/force-delete/`),
  },
  orders: {
    list: () => api.get("/admin/orders/"),
    detail: (id: number) => api.get(`/admin/orders/${id}/`),
    byStatus: (status: string) => api.get(`/admin/orders/status/${status}/`),
    setStatus: (id: number, status: string) =>
      api.post(`/orders/orders/${id}/set-status/`, { status }),
    setPaymentStatus: (id: number, payment_status: string) =>
      api.post(`/admin/orders/${id}/set-payment-status/`, { payment_status }),
    confirmCashPayment: (id: number) =>
      api.post(`/admin/orders/${id}/confirm-cash-payment/`),
  },
  sellers: {
    list: () => api.get("/sellers/sellers/"),
    detail: (id: number) => api.get(`/sellers/sellers/${id}/`),
    stats: (id: number) => api.get(`/sellers/sellers/${id}/stats/`),
  },
  sellerRequests: {
    list: () => api.get("/sellers/seller-requests/"),
    detail: (id: number) => api.get(`/sellers/seller-requests/${id}/`),
    action: (id: number, data: { action: "approve" | "reject"; reason?: string }) =>
      api.post(`/sellers/seller-requests/${id}/admin/action/`, data),
  },
  categories: categoryApi,
  products: productApi,
};

export default api;
