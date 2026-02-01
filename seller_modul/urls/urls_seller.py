# seller_modul/urls.py

app_name = 'seller_modul'

from rest_framework.routers import DefaultRouter
from django.urls import include, path

from seller_modul.views.views_seller import SellerViewSet
from seller_modul.views.views_seller_request import SellerRequestViewSet

router = DefaultRouter()
router.register(r"sellers", SellerViewSet, basename="seller")
router.register(r"seller-requests", SellerRequestViewSet, basename="sellerrequest")

urlpatterns = [
    # router-provided endpoints (list, retrieve, custom actions...)
    path("", include(router.urls)),
]


