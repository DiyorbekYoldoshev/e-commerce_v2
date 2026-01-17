from django.db import models
from django.conf import settings

from ..models.product import BaseModel,Product

User = settings.AUTH_USER_MODEL

class Wishlist(BaseModel):

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='wishlist_items')
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='wishlisted_by')

    class Meta:

        unique_together = ('user','product')
        verbose_name = 'Wishlist'
        verbose_name_plural = 'Wishlists'

    def __str__(self):
        return f"{self.user} ❤️ {self.product}"