from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

User = get_user_model()

def change_password(*,user:User,old_password:str,new_password:str) -> None:

    if not user.check_password(old_password):
        raise ValidationError(
            {
                'old_password':"Eski parol noto'g'ri"
            }
        )
    user.set_password(new_password)
    user.save(update_fields=['password'])
