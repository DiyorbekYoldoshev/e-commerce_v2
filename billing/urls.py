from django.urls import path
from .views import CreatePaymentIntent, PaymentListView
from .webhooks import stripe_webhook

app_name = "billing"

urlpatterns = [
    path(
        "create-intent/",
        CreatePaymentIntent.as_view(),
        name="create-payment-intent"
    ),
    path(
        "webhook/",
        stripe_webhook,
        name="stripe-webhook"
    ),
    path(
        "",
        PaymentListView.as_view(),
        name="payment-list"
    ),
]