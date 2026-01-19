from django.db.models.signals import post_save, post_delete
from django.contrib.auth import get_user_model
from django.dispatch import receiver
from django.db import transaction
User = get_user_model()
from ..models.profile import Profile

@receiver(post_save,sender=User)
def user_create_profile(sender,instance,created,**kwargs):
    if created:

        with transaction.atomic():
            Profile.objects.create(user=instance)

@receiver(post_delete, sender=Profile)
def cleanup_profile_avatar(sender, instance, **kwargs):
    with transaction.atomic():
        if instance.avatar:
            instance.avatar.delete(save=False)
