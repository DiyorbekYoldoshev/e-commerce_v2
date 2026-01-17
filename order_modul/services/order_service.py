from django.db import transaction

from order_modul.models import Order, OrderItem


def create_order(user,items):
    with transaction.atomic():
        order = Order.objects.create(user=user)

        for item in items:
            product = item['product']
            qty = item['quantity']

            if product.base_stock < qty:
                raise ValueError("Stock yetarli emas")
            product.base_stock -= qty
            product.save()

            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=qty,
                price=product.base_price
            )
        return order