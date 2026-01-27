# seller_modul/urls_admin.py
from django.urls import path

from seller_modul.views.seller_request import (
    AdminSellerRequestListView,
    AdminSellerRequestDetailView,
    AdminSellerRequestApproveView,
    AdminSellerRequestRejectView,
)
from seller_modul.views.seller import (
    AdminSellerListView,
    AdminSellerDetailView,
    AdminSellerUpdateView,
)

urlpatterns = [
    # seller requests
    path("seller-requests/", AdminSellerRequestListView.as_view(), name="admin-seller-requests"),
    path("seller-requests/<int:pk>/", AdminSellerRequestDetailView.as_view(), name="admin-seller-request-detail"),
    path("seller-requests/<int:pk>/approve/", AdminSellerRequestApproveView.as_view(), name="admin-seller-request-approve"),
    path("seller-requests/<int:pk>/reject/", AdminSellerRequestRejectView.as_view(), name="admin-seller-request-reject"),

    # sellers
    path("sellers/", AdminSellerListView.as_view(), name="admin-sellers"),
    path("sellers/<int:pk>/", AdminSellerDetailView.as_view(), name="admin-seller-detail"),
    path("sellers/<int:pk>/update/", AdminSellerUpdateView.as_view(), name="admin-seller-update"),
]
