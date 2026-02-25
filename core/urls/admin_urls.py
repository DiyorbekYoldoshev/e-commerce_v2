from rest_framework.routers import DefaultRouter

from users.views.admin import AdminViewSet
from order_modul.views.admin import AdminOrderViewSet

router = DefaultRouter()

router.register(r"users",AdminViewSet,basename='admin-users')
router.register(r"orders",AdminOrderViewSet,basename='admin-orders')
# router.register(r"coupons",AdminCouponViewSet,basename='admin-coupon')

urlpatterns = router.urls