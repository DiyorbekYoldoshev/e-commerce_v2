from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator


from .manager import SellerManager
from .abstract import BaseModel
from simple_history.models import HistoricalRecords

phone_regex = RegexValidator(
    regex=r'^\+998\d{9}$',
    message="Telefon raqamingizni shu tartibda kiriting: +998901234567"
)


class Seller(BaseModel):

    user = models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='seller')
    shop_name = models.CharField(max_length=255,null=False,blank=False)
    description = models.TextField()

    phone_number  = models.CharField(max_length=13,validators=[phone_regex],null=False,blank=False)
    address = models.CharField(max_length=255,null=False,blank=False)

    rating = models.FloatField(default=0,null=True,blank=True)
    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=True)
    history = HistoricalRecords()

    objects = SellerManager()

    class Meta:
        verbose_name = 'Seller'
        verbose_name_plural = 'Sellers'
        ordering = ['-created_at']


    def block(self):
        self.is_blocked = True
        self.save(update_fields=['is_blocked'])

    def unblock(self):
        self.is_blocked = False
        self.save(update_fields=['is_blocked'])

    def __str__(self):
        return f"{self.shop_name} ({self.user})"

class SellerRequest(BaseModel):

    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = (
        (STATUS_PENDING,'Kutilmoqda'),
        (STATUS_APPROVED,'Tasdiqlandi'),
        (STATUS_REJECTED,'Rad etildi')
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='seller_request')
    shop_name = models.CharField(max_length=255)
    description = models.TextField()

    phone_number = models.CharField(max_length=13,validators=[phone_regex],null=True,blank=True)
    address = models.CharField(max_length=200)

    status = models.CharField(max_length=8,choices=STATUS_CHOICES,default=STATUS_PENDING)
    history = HistoricalRecords()

    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_reason = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = 'Seller Request'
        verbose_name_plural = 'Seller Requests'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(status='pending'),
                name='unique_pending_seller_request'
            )
        ]

    def __str__(self):
        return f"{self.shop_name} - {self.status}"