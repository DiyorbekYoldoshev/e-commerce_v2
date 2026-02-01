# 1 - imports
import os
import uuid
from typing import Optional

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models, IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from simple_history.models import HistoricalRecords

from .manager import UserManager
from .abstract import BaseModel


def avatar_upload_to(instance, filename):
    ext = filename.split(".")[-1]
    # try to resolve user id in common cases
    user_id = None
    if hasattr(instance, 'user') and getattr(instance, 'user'):
        user_id = getattr(instance.user, 'id', None)
    elif hasattr(instance, 'id'):
        user_id = getattr(instance, 'id', None)

    uid = user_id or 'anonymous'
    filename = f"{uuid.uuid4().hex}.{ext}"
    return os.path.join('avatars', str(uid), filename)


# 2 - choices
class GenderChoices(models.TextChoices):
    MALE = 'male', 'Erkak'
    FEMALE = 'female', 'Ayol'
    OTHER = 'other', 'Boshqa'


# 3 - main class
class User(PermissionsMixin, AbstractBaseUser, BaseModel):
    """Custom User model using email as identifier."""

    # 4 - fields
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=120, null=True, blank=True)
    last_name = models.CharField(max_length=120, null=True, blank=True)
    slug = models.SlugField(unique=True, null=True, blank=True)

    gender = models.CharField(
        max_length=6,
        choices=GenderChoices.choices,
        default=GenderChoices.MALE,
        null=True,
        blank=True
    )

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    is_deleted = models.BooleanField(default=False)
    history = HistoricalRecords()

    # 5 - manager
    objects = UserManager()

    # 6 - FIELDS
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    # 7 - full_name
    @property
    def full_name(self) -> str:
        return f"{self.first_name or ''} {self.last_name or ''}".strip()

    # 8 - str
    def __str__(self):
        return self.full_name or self.email

    # 9 - clean
    def clean(self):
        # optional validation
        if self.first_name and len(self.first_name) < 3:
            raise ValidationError("Ism kamida 3 ta belgi bo'lishi kerak")
        if self.last_name and len(self.last_name) < 3:
            raise ValidationError("Familya kamida 3 ta belgi bo'lishi kerak")
        if self.gender and self.gender not in dict(GenderChoices.choices):
            raise ValidationError("Noto'g'ri jins tanlandi")

    def _generate_unique_slug(self, base: Optional[str] = None) -> str:
        candidate = slugify(base or (self.first_name or self.email.split('@')[0]))
        if not candidate:
            candidate = uuid.uuid4().hex[:8]
        unique_slug = candidate
        n = 0
        Model = self.__class__
        while Model.objects.all_with_deleted().filter(slug=unique_slug).exists():
            n += 1
            unique_slug = f"{candidate}-{n}"
        return unique_slug

    # 10 - save
    def save(self, *args, **kwargs):
        # ensure slug exists
        if not self.slug:
            self.slug = self._generate_unique_slug()

        # attempt normal save; in rare race condition, retry once
        try:
            super().save(*args, **kwargs)
        except IntegrityError:
            # regenerate slug and retry once
            self.slug = self._generate_unique_slug() + '-' + uuid.uuid4().hex[:4]
            super().save(*args, **kwargs)

    # 11 - class meta
    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"
        ordering = ['-created_at']

        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['first_name', 'last_name']),
            models.Index(fields=['slug']),
        ]

        permissions = [
            ('can_view_sensitive_data', "Maxfiy foydalanuvchilarni ko'rish"),
            ('can_change_user_status', "Foydalanuvchi statusini o'zgartirish"),
        ]

    # 12 - core
    @property
    def is_seller(self):
        return hasattr(self, 'seller') and self.seller is not None

    @property
    def is_customer(self):
        return hasattr(self, 'customer') and self.customer is not None

    def soft_delete(self):
        self.is_deleted = True
        self.is_active = False
        self.save(update_fields=['is_deleted', 'is_active'])

    def restore(self):
        self.is_deleted = False
        self.is_active = True
        self.save(update_fields=['is_deleted', 'is_active'])

    def hard_delete(self):
        return super().delete()
