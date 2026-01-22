from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed
from django.db import transaction

from users.models import User, Profile


def authenticate_user(*,email:str,password:str):
    user  = authenticate(email=email,password=password)
    if not user:
        raise AuthenticationFailed("Email yoki parol xato")
    if user.is_deleted:
        raise AuthenticationFailed("Foydalanuvchi o‘chirilgan")
    if not user.is_active:
        raise AuthenticationFailed("Foydalanuvchi bloklangan")
    return user

@transaction.atomic
def register_user(*,email:str,password:str,first_name:str="",last_name="",**extra_fields) -> User:
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        **extra_fields
    )
    Profile.objects.get_or_create(user=user)
    return user
