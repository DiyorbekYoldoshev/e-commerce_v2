from django.db import models
from django.utils import timezone


class OrderQuerySet(models.QuerySet):

    def active(self):
        return self.filter(is_active=True)

    def paid(self):
        return self.filter(payment_status="paid")

    def unpaid(self):
        return self.filter(payment_status="unpaid")

    def delivered(self):
        return self.filter(order_status="delivered")

    def today(self):
        return self.filter(created_at__date=timezone.now().date())

    def search(self, query):
        return self.filter(
            models.Q(phone__icontains=query) |
            models.Q(address__icontains=query)
        )

class OrderManager(models.Manager.from_queryset(OrderQuerySet)):
    pass
