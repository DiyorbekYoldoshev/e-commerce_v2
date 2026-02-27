from django.contrib.auth.password_validation import validate_password
from django.db import transaction, IntegrityError
from ..models.profile import Profile
from ..models.user import User
from rest_framework.validators import ValidationError

@transaction.atomic
def create_user(
        *,
        email:str,
        password:str,
        first_name:str | None=None,
        last_name:str | None=None,
        **extra_fields,
    ) -> User:

    if not email:
        raise ValidationError(
            {'email':"Email bo'lishi kerak"}
        )
    email = User.objects.normalize_email(email=email).lower().strip()
    validate_password(password=password)
    try:
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name or "",
            last_name=last_name or "",
            **extra_fields
        )
    except IntegrityError:
        raise ValidationError(
            {'email':"Bu email oldin ro'yxatdan o'tgan"}
        )
    return user

@transaction.atomic
def create_superuser(*, email: str, password: str, **extra_fields) -> User:
    if not email:
        raise ValidationError({"email": "Email bo'lishi kerak"})

    email = User.objects.normalize_email(email).lower().strip()
    validate_password(password)

    extra_fields.setdefault("is_staff", True)
    extra_fields.setdefault("is_superuser", True)
    extra_fields.setdefault("is_active", True)

    try:
        user = User.objects.create_superuser(email=email, password=password, **extra_fields)
    except IntegrityError:
        raise ValidationError({"email": "Bu email oldin ro'yxatdan o'tgan"})

    return user





