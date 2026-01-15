from django.db import models

class ActiveQuerySet(models.QuerySet):

    def active(self):
        return self.filter(is_active=True)


class ActiveManager(models.Manager):

    def get_queryset(self):
        return ActiveQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()