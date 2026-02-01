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
    path("auth/login/", LoginView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/password/change/", ChangePasswordView.as_view()),

    # jwt token endpoints
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # me/profile
    path("me/", MeView.as_view()),
    path("profile/", ProfileView.as_view()),
]
