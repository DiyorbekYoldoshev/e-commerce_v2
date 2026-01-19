from django.contrib.auth import authenticate
from rest_framework.exceptions import AuthenticationFailed

def authenticate_user(*,email:str,password:str):
    user  = authenticate(email=email,password=password)
    if not user:
        raise AuthenticationFailed("Email yoki parol xato")
    if not user.is_active:
        raise AuthenticationFailed("Foydalanuvchi bloklangan")
    return user
