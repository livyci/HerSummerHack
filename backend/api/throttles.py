"""Rate limits for the (cost-bearing) AI endpoints.

Two layers, both needed: a per-user cap so one account can't hammer the model,
and a single global bucket so the total Anthropic spend is bounded regardless
of how many accounts are created. Rates come from DEFAULT_THROTTLE_RATES.
"""
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class AIUserThrottle(UserRateThrottle):
    scope = "ai"


class AIGlobalThrottle(SimpleRateThrottle):
    scope = "ai_global"

    def get_cache_key(self, request, view):
        # One shared bucket for everyone -> a hard ceiling on total AI calls,
        # so creating extra accounts can't bypass the per-user limit.
        return "throttle_ai_global"
