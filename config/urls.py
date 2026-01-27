from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

# ----------------------------
# 1) API URLPATTERNS (real API)
# ----------------------------

public_api_patterns = [
    path("api/v1/users/", include("users.urls")),
    # path("api/v1/orders/", include("order_modul.urls")),
    # path("api/v1/products/", include("product_modul.urls")),
    # path("api/v1/categories/", include("category_modul.urls")),

    # path("api/v1/auth/", include("core.urls.auth_urls")),
]

# Admin API
admin_api_patterns = [
    path("api/v1/admin/", include("core.urls.admin_urls")),
    path("api/v1/admin/", include("seller_modul.urls.urls_core")),
]

# Seller API
seller_api_patterns = [
    path("api/v1/sellers/", include("seller_modul.urls")),
    # path("api/v1/seller/", include("seller_modul.urls")),
]

all_api_patterns = public_api_patterns + admin_api_patterns + seller_api_patterns

# ----------------------------
# 2) Swagger schema views
# ----------------------------
common_info = openapi.Info(
    title="E-Commerce API",
    default_version="v1",
    description="API Documentation",
)

schema_public = get_schema_view(
    common_info,
    public=True,
    permission_classes=[permissions.AllowAny],
    patterns=public_api_patterns,
)

schema_admin = get_schema_view(
    openapi.Info(
        title="E-Commerce Admin API",
        default_version="v1",
        description="Admin endpoints only",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    patterns=admin_api_patterns,
)

schema_seller = get_schema_view(
    openapi.Info(
        title="E-Commerce Seller API",
        default_version="v1",
        description="Seller endpoints only",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    patterns=seller_api_patterns,
)

# ----------------------------
# 3) URLPATTERNS
# ----------------------------
urlpatterns = [
    # Django admin (panel)
    path("admin/", admin.site.urls),

    # Swagger UIs
    path("docs/", schema_public.with_ui("swagger", cache_timeout=0), name="docs-public"),
    path("docs/admin/", schema_admin.with_ui("swagger", cache_timeout=0), name="docs-admin"),
    path("docs/seller/", schema_seller.with_ui("swagger", cache_timeout=0), name="docs-seller"),
    path("docs/seller/admin/", schema_seller.with_ui("swagger", cache_timeout=0), name="docs-seller"),

    path("docs/schema.json", schema_public.without_ui(cache_timeout=0), name="schema-json-public"),

    # API routes (real endpoints)
    *all_api_patterns,
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
