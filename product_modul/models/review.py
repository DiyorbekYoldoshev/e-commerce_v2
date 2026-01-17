from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator,MaxValueValidator

from product_modul.models import Product,BaseModel

User = settings.AUTH_USER_MODEL

class Review(BaseModel):

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='reviews')
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='reviews')
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1),MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)

    class Meta:
        unique_together = ('user','product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product} ⭐ {self.rating}"