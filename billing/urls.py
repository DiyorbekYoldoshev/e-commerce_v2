from django.urls import path
from .views import CreatePaymentIntent
from .webhooks import stripe_webhook
from .views import PaymentListView

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