from rest_framework.routers import DefaultRouter

from users.views.admin import AdminViewSet
from order_modul.views.admin import AdminOrderViewSet,AdminCouponViewSet

router = DefaultRouter()

router.register(r"admin/user",AdminViewSet,basename='admin-user')
router.register(r"admin/order",AdminOrderViewSet,basename='admin-order')
router.register(r"admin/coupon",AdminCouponViewSet,basename='admin-coupon')
