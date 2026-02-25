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

        for i in items:
            v = vmap.get(i["variant"])
            if not v:
                raise ValueError(f"Variant {i['variant']} not found")

            qty = int(i["quantity"])
            if v.stock < qty:
                raise ValueError("Stock yetarli emas")

            OrderItem.objects.create(
                order=order,
                variant=v,
                quantity=qty,
                unit_price=v.price,
                subtotal=v.price * qty,
            )

            v.stock -= qty
            v.save(update_fields=["stock"])

        order.calculate_total()
        return order