from django.db import transaction
from users.models.profile import Profile

@transaction.atomic

def update_me(*,user,data:dict):

    user_fields = ['first_name','last_name','gender']
    for f in user_fields:
        if f in data:
            setattr(user,f,data[f])
    user.save(update_fields=[f for f in user_fields if f in data])

    profile_fields = ['phone','bio']
    prof_data = {f:data[f] for f in profile_fields if f in data}
    if prof_data:
        profile,_ = Profile.objects.get_or_create(user=user)
        for f, v in prof_data.items():
            setattr(profile,f,v)
        profile.save(update_fields=list(prof_data.keys()))
        return user_fields