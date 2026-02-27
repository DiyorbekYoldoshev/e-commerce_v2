# users/urls/misc.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.views.user import UserViewSet

app_name = "users"

router = DefaultRouter()
router.register(r"", UserViewSet, basename="auth_login")

urlpatterns = [
    path("", include(router.urls)),

    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]