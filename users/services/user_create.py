from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

@transaction.atomic
def create_user(*,email:str,password:str,**extra_fields) -> User:

    email = User.objects.normalize_email(email)

    user = User(
        email=email,
        **extra_fields
    )
    user.set_password(password)
    user.save()
    return user