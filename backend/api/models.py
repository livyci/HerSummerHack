from django.contrib.auth.models import User
from django.db import models


class Purchase(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="purchases")
    product_id = models.CharField(max_length=64)
    bought_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product_id")
        ordering = ["-bought_at"]

    def __str__(self):
        return f"{self.user.username}:{self.product_id}"
