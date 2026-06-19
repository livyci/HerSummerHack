import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

import anthropic

from . import ai
from .models import Purchase
from .throttles import AIGlobalThrottle, AIUserThrottle


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    if not username or not password:
        return Response({"error": "Username and password are required."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "That username is already taken."}, status=400)
    try:
        validate_password(password, User(username=username))
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)
    user = User.objects.create_user(username=username, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"error": "Invalid username or password."}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=204)


def _product_ids(user):
    return list(user.purchases.values_list("product_id", flat=True))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def purchases(request):
    if request.method == "POST":
        product_id = (request.data.get("product_id") or "").strip()
        if not product_id:
            return Response({"error": "product_id is required."}, status=400)
        Purchase.objects.get_or_create(user=request.user, product_id=product_id)
    return Response({"product_ids": _product_ids(request.user)})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def purchase_detail(request, product_id):
    Purchase.objects.filter(user=request.user, product_id=product_id).delete()
    return Response({"product_ids": _product_ids(request.user)})


# ---- AI (Anthropic, server-side; the API key never reaches the browser) ----
#
# These endpoints cost money per call, so they are guarded on three fronts:
#   - auth required (IsAuthenticated) — no anonymous access;
#   - rate limited per-user AND globally (see throttles.py) — bounds spend;
#   - every client-controlled field is size/shape capped before it reaches the
#     model — prevents token-amplification and shrinks the prompt-injection
#     surface for the discover allowlists.

MAX_BODY_BYTES = 64 * 1024
MAX_LIST_ITEMS = 256
MAX_PRODUCTS = 300
# Allowlist items are short slugs / labels: letters, digits, space and a few
# punctuation marks — no newlines or control chars that could break the prompt.
_SLUG_RE = re.compile(r"^[\w &.\-/()]{1,64}$")

AI_THROTTLES = [AIUserThrottle, AIGlobalThrottle]


def _oversize(request):
    try:
        return int(request.META.get("CONTENT_LENGTH") or 0) > MAX_BODY_BYTES
    except (TypeError, ValueError):
        return False


def _clean_slugs(values):
    """Keep only short, slug-shaped strings (capped count); drop everything else."""
    if not isinstance(values, list):
        return []
    return [v for v in values[:MAX_LIST_ITEMS] if isinstance(v, str) and _SLUG_RE.match(v)]


def _ai_call(fn):
    """Run an AI helper, translating failures into clean JSON responses.

    503 = server has no API key configured; 502 = upstream Anthropic error.
    """
    try:
        return Response(fn())
    except ai.MissingApiKey as exc:
        return Response({"error": str(exc)}, status=503)
    except anthropic.APIError as exc:
        message = getattr(exc, "message", None) or str(exc)
        return Response({"error": f"Anthropic API error: {message}"}, status=502)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes(AI_THROTTLES)
def ai_discover(request):
    if _oversize(request):
        return Response({"error": "Request too large."}, status=413)
    data = request.data
    # Allowlists are validated/capped server-side so an attacker can't stuff the
    # system prompt with arbitrary text. `parse_prompt_to_filters` also caps the
    # free-text prompt and re-validates the model's output against these lists.
    return _ai_call(
        lambda: ai.parse_prompt_to_filters(
            data.get("prompt", ""),
            _clean_slugs(data.get("availableTags")),
            _clean_slugs(data.get("availableCategories")),
            _clean_slugs(data.get("availableColors")),
        )
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes(AI_THROTTLES)
def ai_compare(request):
    if _oversize(request):
        return Response({"error": "Request too large."}, status=413)
    scanned = request.data.get("scanned")
    list_item = request.data.get("listItem")
    if not isinstance(scanned, dict) or not isinstance(list_item, dict):
        return Response(
            {"error": "scanned and listItem must be product objects."}, status=400
        )
    return _ai_call(lambda: {"text": ai.compare_products(scanned, list_item)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes(AI_THROTTLES)
def ai_promotions(request):
    if _oversize(request):
        return Response({"error": "Request too large."}, status=413)
    products = request.data.get("products") or []
    if not isinstance(products, list) or len(products) > MAX_PRODUCTS:
        return Response(
            {"error": f"products must be a list of at most {MAX_PRODUCTS} items."},
            status=400,
        )
    products = [p for p in products if isinstance(p, dict)]
    return _ai_call(lambda: {"text": ai.suggest_promotions(products)})
