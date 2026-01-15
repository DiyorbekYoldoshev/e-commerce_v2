from django.contrib.auth.models import BaseUserManager
from .queryset import UserQuerySet
from django.core.exceptions import ValidationError

class UserManager(BaseUserManager):

    def get_queryset(self):
        return UserQuerySet(self.model, using=self._db).filter(is_deleted=False)

    def all_with_deleted(self):
        return UserQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()

    def deleted(self):
        return self.get_queryset().deleted()

    def search(self, text):
        return self.all_with_deleted().search(text)

    def _create_user(self,email,password,**extra_fields):

        if not email:
            raise ValidationError("Email bo'lshi kerak")
        email = self.normalize_email(email)
        user = self.model(email=email,**extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_user(self,email,password,**extra_fields):
        extra_fields.setdefault("is_active",True)
        extra_fields.setdefault("is_staff",False)
        extra_fields.setdefault("is_superuser", False)

        return self._create_user(email,password,**extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValidationError("Superuser is_staff bo‘lishi kerak")
        if extra_fields.get("is_superuser") is not True:
            raise ValidationError("Superuser is_superuser bo‘lishi kerak")

        return self._create_user(email, password, **extra_fields)


