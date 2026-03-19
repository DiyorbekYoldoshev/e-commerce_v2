from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.views.user import UserViewSet, AdminUserViewSet

app_name = "users"

router = DefaultRouter()

# user endpoints
router.register(r"", UserViewSet, basename="users")

# admin endpoints
router.register(r"admin/users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    path("", include(router.urls)),

    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]