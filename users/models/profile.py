# 1 - imports
from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator
from .abstract import BaseModel
from .user import avatar_upload_to

# 2 - regex
phone_regex = RegexValidator(
    regex=r'^\+998\d{9}$',
    message="Telefon raqamingizni shu tartibda kiriting: +998901234567"
)

# 3 - main class
class Profile(BaseModel):
    # 4 - fields
    user = models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='profile')
    phone = models.CharField(max_length=13, validators=[phone_regex],null=True,blank=True)
    bio = models.TextField(null=True,blank=True)
    avatar = models.ImageField(upload_to=avatar_upload_to)

    # 5 - str
    def __str__(self):
        return self.user.full_name()
