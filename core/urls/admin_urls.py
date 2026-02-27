from rest_framework.routers import DefaultRouter

from order_modul.views.admin import AdminOrderViewSet
from users.views.user import AdminUserViewSet

router = DefaultRouter()

router.register(r"users",AdminUserViewSet,basename='admin-users')
router.register(r"orders",AdminOrderViewSet,basename='admin-orders')
# router.register(r"coupons",AdminCouponViewSet,basename='admin-coupon')

urlpatterns = router.urls