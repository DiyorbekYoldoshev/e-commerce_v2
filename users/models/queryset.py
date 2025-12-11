from django.db.models import Q,QuerySet

class UserQuerySet(QuerySet):

    def active(self):
        return self.filter(is_active=True,is_delete=False)

    def staff(self):
        return self.filter(is_staff=True,is_delete=False)

    def is_deleted(self):
        return self.filter(is_delete=True)

    def all_with_deleted(self):
        return self

    def search(self, text):

        return self.filter(
            Q(email__icontains=text)|
            Q(first_name__icontains=text)|
            Q(last_name__icontains=text)|
            Q(full_name__icontains=text)
        )