from django.db.models import Q, QuerySet, Manager

class ActiveQuerySetProduct(QuerySet):

    def active(self):
        return self.filter(is_active=True)

    def search(self,text):
        return self.filter(
            Q(name__icontains=text)|
            Q(slug__icontains=text)
        )

class ActiveManagerProduct(Manager):

    def get_queryset(self):
        return ActiveQuerySetProduct(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()