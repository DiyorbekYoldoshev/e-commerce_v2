app_name = 'users'

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from users.views.profile import ProfileView, MeView

from users.views.auth.login import LoginView
from users.views.auth.register import RegisterView
from users.views.auth.password import ChangePasswordView

urlpatterns = [
    # auth
    path("auth/login/", LoginView.as_view(), name='login'),
    path("auth/register/", RegisterView.as_view(), name='register'),
    path("auth/password/change/", ChangePasswordView.as_view(), name='password_change'),

    # jwt token endpoints
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # me/profile
    path("me/", MeView.as_view(), name='me'),
    path("profile/", ProfileView.as_view(), name='profile'),
]
