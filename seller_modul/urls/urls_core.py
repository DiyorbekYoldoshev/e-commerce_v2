# seller_modul/urls.py
from django.urls import path
from seller_modul.views.public import SellerListView, SellerDetailView
from seller_modul.views.me import SellerMeView

urlpatterns = [
    path("", SellerListView.as_view(), name="seller-list"),
    path("me/", SellerMeView.as_view(), name="seller-me"),
    path("<int:pk>/", SellerDetailView.as_view(), name="seller-detail"),
]
