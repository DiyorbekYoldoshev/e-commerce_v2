from ..models.profile import Profile
from django.db import transaction

def get_profile(*,user):
    profile,_=Profile.objects.get_or_create(user=user)
    return profile

@transaction.atomic
def update_profile(*,user,phone=None,bio=None,avatar=None) ->Profile:
    profile,_=Profile.objects.get_or_create(user=user)
    if phone is not None:
        profile.phone = phone
    if bio is not None:
        profile.bio = bio
    if avatar is not None:
        profile.avatar = avatar

    profile.save()
    return profile