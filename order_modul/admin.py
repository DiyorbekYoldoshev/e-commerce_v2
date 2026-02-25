from django.contrib import admin
from order_modul.models.order import Order, OrderItem, InstallmentPlan, InstallmentPayment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "payment_status",
        "status_choices",
        "total_amount",
        "payable_amount",
        "is_installment",
        "created_at",
    )

    list_filter = (
        "payment_status",
        "status_choices",
        "is_installment",
        "created_at",
    )

    search_fields = (
        "id",
        "user__username",
        "phone",
        "address",
    )

    date_hierarchy = "created_at"

    readonly_fields = (
        "total_amount",
        "discount_amount",
        "payable_amount",
    )


# -----------------------------
# OrderItem
# -----------------------------
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "product_name",
        "variant",
        "quantity",
        "unit_price",
        "subtotal",
    )

    list_select_related = ("order", "variant", "variant__product")

    search_fields = (
        "order__id",
        "variant__sku",
        "variant__product__name",
    )

    def product_name(self, obj):
        return obj.variant.product.name

    product_name.admin_order_field = "variant__product__name"
    product_name.short_description = "Product"


# -----------------------------
# InstallmentPlan
# -----------------------------
@admin.register(InstallmentPlan)
class InstallmentPlanAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "months",
        "total_amount",
        "monthly_amount",
        "is_approved",
        "created_at",
    )

    list_filter = ("months", "is_approved")

    search_fields = ("order__id", "order__user__username")

    readonly_fields = ("total_amount", "monthly_amount")


# -----------------------------
# InstallmentPayment
# -----------------------------
@admin.register(InstallmentPayment)
class InstallmentPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "installment",
        "order_id",
        "month",
        "amount",
        "is_paid",
        "paid_at",
    )

    list_filter = ("is_paid", "month")

    search_fields = ("installment__order__id",)

    def order_id(self, obj):
        return obj.installment.order.id

    order_id.short_description = "Order"