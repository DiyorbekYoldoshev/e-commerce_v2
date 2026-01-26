from django.urls import path

from users.views.profile import ProfileView, MeView

from users.views.auth.login import LoginView
from users.views.auth.register import RegisterView
from users.views.auth.password import ChangePasswordView

urlpatterns = [
    # auth
    path("auth/login/", LoginView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/password/change/", ChangePasswordView.as_view()),

    # me/profile
    path("me/", MeView.as_view()),
    path("profile/", ProfileView.as_view()),
]
