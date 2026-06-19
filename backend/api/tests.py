from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase

from api.models import Purchase


class PurchaseModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw-strong-123")

    def test_create_purchase(self):
        p = Purchase.objects.create(user=self.user, product_id="P100")
        self.assertEqual(p.product_id, "P100")
        self.assertIsNotNone(p.bought_at)
        self.assertEqual(list(self.user.purchases.values_list("product_id", flat=True)), ["P100"])

    def test_duplicate_purchase_rejected(self):
        Purchase.objects.create(user=self.user, product_id="P100")
        with self.assertRaises(IntegrityError):
            Purchase.objects.create(user=self.user, product_id="P100")
