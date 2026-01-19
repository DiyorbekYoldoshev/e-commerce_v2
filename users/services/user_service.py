from users.models import Profile,User

def register_create(*,email,password,first_name,last_name):

    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    Profile.objects.create(user=user)
    return user