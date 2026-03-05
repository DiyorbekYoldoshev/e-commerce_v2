app_name = 'product_modul'

from rest_framework.routers import DefaultRouter
from django.urls import include,path

from .views import ProductViewSet, ReviewViewSet, ProductVariantViewSet

router = DefaultRouter()
router.register(r'product',ProductViewSet,basename='product')
router.register(r'product-variant',ProductVariantViewSet,basename='product-variant')
router.register(r'product-review',ReviewViewSet,basename='product-review')

urlpatterns = [
    path("",include(router.urls))
]