from django.contrib.auth import get_user_model

User = get_user_model()

def update_user(*,user:User,data:dict) -> User:

    for field, value in data.items():
        setattr(user,field,value)
    user.save(update_fields=data.keys())
    return user