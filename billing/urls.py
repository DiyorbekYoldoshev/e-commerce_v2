from django.urls import path

from .views import (
    BalanceView,
    CardDeleteView,
    CardListCreateView,
    PaymentHistoryView,
    ProcessPaymentView,
    TopUpBalanceView,
)

urlpatterns = [
    # Kartalar
    path("cards/", CardListCreateView.as_view(), name="card-list-create"),
    path("cards/<int:pk>/", CardDeleteView.as_view(), name="card-delete"),

    # Balans
    path("balance/", BalanceView.as_view(), name="balance"),
    path("balance/topup/", TopUpBalanceView.as_view(), name="balance-topup"),

    # To'lov
    path("process-payment/", ProcessPaymentView.as_view(), name="process-payment"),

    # Tarix
    path("history/", PaymentHistoryView.as_view(), name="payment-history"),
]
