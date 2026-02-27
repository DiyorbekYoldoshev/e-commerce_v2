from django.db import transaction
from decimal import Decimal

from order_modul.models import Order, OrderItem
from product_modul.models import ProductVariant


def create_order(user, order_data, items):
    with transaction.atomic():

        order = Order.objects.create(user=user, **order_data)

        variant_ids = [i["variant"] for i in items]
        variants = ProductVariant.objects.select_for_update().filter(id__in=variant_ids)
        vmap = {v.id: v for v in variants}

        if len(vmap) != len(set(variant_ids)):
            raise ValueError("Variantlardan biri topilmadi")

        for item in items:
            variant = vmap[item["variant"]]
            qty = int(item["quantity"])

            if variant.stock < qty:
                raise ValueError(f"Stock yetarli emas: {variant.sku}")

            OrderItem.objects.create(
                order=order,
                variant=variant,
                quantity=qty,
                unit_price=variant.price,
                subtotal=variant.price * qty,
            )

            variant.stock -= qty
            variant.save(update_fields=["stock"])

        order.calculate_totals()

        return order