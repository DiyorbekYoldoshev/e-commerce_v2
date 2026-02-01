from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from rest_framework_simplejwt.authentication import JWTAuthentication

# ======================================================
# 1) REAL API ROUTES (BACKEND API)
# ======================================================

# -------- PUBLIC API --------
public_api_patterns = [
    path("api/v1/users/", include("users.urls")),
    # path("api/v1/products/", include("product_modul.urls")),
    # path("api/v1/categories/", include("category_modul.urls")),
]


# -------- SELLER API --------
seller_api_patterns = [
    # Seller public + me endpoints
    path("api/v1/sellers/", include("seller_modul.urls")),
]


# -------- ADMIN API --------
admin_api_patterns = [
    # Core admin (users, orders, coupons ...)
    path("api/v1/admin/", include("core.urls.admin_urls")),

    # Seller admin panel endpoints
    # path("api/v1/admin/", include("seller_modul.urls.urls_admin")),
]


# Combine all real API routes
all_api_patterns = (
    public_api_patterns
    + seller_api_patterns
    + admin_api_patterns
)

# ======================================================
# 2) SWAGGER SCHEMA CONFIG
# ======================================================

common_info = openapi.Info(
    title="E-Commerce API",
    default_version="v1",
    description="E-Commerce REST API Documentation",
)

# ---------- PUBLIC SWAGGER ----------
schema_public = get_schema_view(
    common_info,
    public=True,
    permission_classes=[permissions.AllowAny],
    patterns=public_api_patterns,
)

# ---------- SELLER SWAGGER ----------
schema_seller = get_schema_view(
    openapi.Info(
        title="E-Commerce Seller API",
        default_version="v1",
        description="Seller endpoints documentation",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    authentication_classes=[JWTAuthentication],
    patterns=seller_api_patterns,
)

# ---------- ADMIN SWAGGER ----------
schema_admin = get_schema_view(
    openapi.Info(
        title="E-Commerce Admin API",
        default_version="v1",
        description="Admin endpoints documentation",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    patterns=admin_api_patterns,
)

# ======================================================
# 3) MAIN URLPATTERNS
# ======================================================

urlpatterns = [

    # Django admin panel
    path("admin/", admin.site.urls),

    # ---------------- SWAGGER UI ----------------

    # Public API docs
    path("docs/", schema_public.with_ui("swagger", cache_timeout=0), name="docs-public"),

    # Seller API docs
    path("docs/seller/", schema_seller.with_ui("swagger", cache_timeout=0), name="docs-seller"),

    # Admin API docs
    path("docs/admin/", schema_admin.with_ui("swagger", cache_timeout=0), name="docs-admin"),

    # Raw schema json (optional)
    path("docs/schema.json", schema_public.without_ui(cache_timeout=0), name="schema-json"),

    # ---------------- REAL API ----------------

    *all_api_patterns,
]


# ======================================================
# 4) STATIC & MEDIA (DEV MODE)
# ======================================================

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
