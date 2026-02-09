from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views.views import OrderViewSet, CouponViewSet

router = DefaultRouter()
router.register('orders', OrderViewSet, basename='orders')
router.register('coupons', CouponViewSet, basename='coupons')

app_name = 'order_modul'

urlpatterns = [
    path('', include(router.urls)),
]
