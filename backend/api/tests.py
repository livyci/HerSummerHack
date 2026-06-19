from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient

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


class AuthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_returns_token(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "bob", "password": "pw-strong-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["username"], "bob")

    def test_register_duplicate_username_rejected(self):
        User.objects.create_user(username="bob", password="pw-strong-123")
        res = self.client.post(
            "/api/auth/register/",
            {"username": "bob", "password": "pw-strong-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.data)

    def test_login_valid_credentials(self):
        User.objects.create_user(username="carol", password="pw-strong-123")
        res = self.client.post(
            "/api/auth/login/",
            {"username": "carol", "password": "pw-strong-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("token", res.data)

    def test_login_bad_credentials_rejected(self):
        User.objects.create_user(username="carol", password="pw-strong-123")
        res = self.client.post(
            "/api/auth/login/",
            {"username": "carol", "password": "wrong"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_logout_deletes_token(self):
        User.objects.create_user(username="dave", password="pw-strong-123")
        login = self.client.post(
            "/api/auth/login/",
            {"username": "dave", "password": "pw-strong-123"},
            format="json",
        )
        token = login.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        res = self.client.post("/api/auth/logout/")
        self.assertEqual(res.status_code, 204)
