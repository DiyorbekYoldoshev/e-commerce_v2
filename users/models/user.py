# 1 - imports
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.text import slugify

from .manager import UserManager
from .abstract import BaseModel

# 2 - choices
class GenderChoices(models.TextChoices):
    MALE = 'male', 'Erkak'
    FEMALE = 'female', 'Ayol'
    OTHER = 'other', 'Boshqa'

# 3 - main class
class User(PermissionsMixin,AbstractBaseUser,BaseModel):

    # 4 - fields
    email = models.EmailField()
    first_name = models.CharField(max_length=120, null=True, blank=True)
    last_name = models.CharField(max_length=120, null=True, blank=True)
    slug = models.SlugField(unique=True,null=True, blank=True)
    gender = models.CharField(
        max_length=6,
        choices=GenderChoices.choices,
        default=GenderChoices.MALE,
        null=True, blank=True
    )

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    is_deleted = models.BooleanField(default=False)

    # 5 - manager
    objects = UserManager()

    # 6 - FIELDS
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name','last_name']

    # 7 - full_name
    def full_name(self):
        return f"{self.first_name or ' '} {self.last_name or ' '}"

    # 8 - clean
    def clean(self):
        # optional validation
        if self.first_name and len(self.first_name) < 3:
            raise ValidationError("Ism kamida 3 ta belgi bo'lishi kerak")
        if self.last_name and len(self.last_name) < 3:
            raise ValidationError("Familya kamida 3 ta belgi bo'lishi kerak")
        if self.gender and self.gender not in dict(GenderChoices.choices):
            raise ValidationError("Noto'g'ri jins tanlandi")

    # 9 - str
    def __str__(self):
        return self.full_name() or self.email

    # 10 - save
    def save(self, *args, **kwargs):
        if not self.slug:
            base = (self.first_name or self.email.split('@')[0])
            candidate = slugify(base)
            n = 0
            unique_slug = candidate
            while User.objects.all_with_deleted().filter(slug=unique_slug).exists():
                n += 1
                unique_slug = f"{candidate}-{n}"
            self.slug = unique_slug
        super().save(*args, **kwargs)

    # 11 - class meta
    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

        ordering = ['-created_at']

        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['first_name','last_name']),
            models.Index(fields=['slug'])
        ]

        constraints = models.UniqueConstraint(
            fields='email',
            name='unique_user_email'
        )
        permissions = [
            ('can_view_sensitive_data', "Maxfiy foydalanuvchilarni ko'rish"),
            ('can_change_user_status', "Foydalanuvchi statusini o'zgartirish")
        ]


    # 12 - core
    @property
    def is_seller(self):
        return hasattr(self,'seller') and self.seller is not None

    @property
    def is_customer(self):
        return hasattr(self,'customer') and self.customer is not None

    def soft_delete(self):
        self.is_deleted = True
        self.is_active = False
        self.save(update_fields=['is_deleted','is_active'])

    def restore(self):
        self.is_deleted = False
        self.is_active = True
        self.save(update_fields=['is_deleted','is_active'])

    def hard_delete(self):
        return super().delete()




