from django.contrib import admin
from .models import Card, Payment, Wallet


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "masked_number", "expiration_date", "balance", "created_at")
    search_fields = ("user__email", "card_number")


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "balance", "updated_at")
    search_fields = ("user__email",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "card", "amount", "status", "installment_payment", "created_at")
    list_filter = ("status",)
    search_fields = ("order__id",)
