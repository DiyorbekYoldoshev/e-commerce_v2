# seller_modul/urls.py

from rest_framework.routers import DefaultRouter

from seller_modul.views.views_seller import SellerViewSet
from seller_modul.views.views_seller_request import SellerRequestViewSet

router = DefaultRouter()
router.register(r"sellers", SellerViewSet, basename="seller")
router.register(r"seller-requests", SellerRequestViewSet, basename="sellerrequest")

from django.urls import path, include

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

    # router urls
    path("", include(router.urls)),
]


