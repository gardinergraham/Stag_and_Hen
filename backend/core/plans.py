"""
PAYMENTS CONTRACT

- /payments/config
  - Required for iOS/app bootstrap
  - iOS-safe
  - No Stripe price IDs or Stripe amounts

- Stripe checkout endpoints
  - Android/web payment path
  - Stripe price IDs are server-side only

- Apple IAP completion endpoint
  - iOS payment path
  - Validates tier/product pairing server-side
"""

STRIPE_PRICE_ENV = {
    "one_day": "STRIPE_PRICE_ONE_DAY",
    "extended": "STRIPE_PRICE_EXTENDED",
    "prime": "STRIPE_PRICE_PRIME",
}

EVENT_PLANS = {
    "one_day": {
        "name": "One Day",
        "display_price_gbp": "£25.00",
        "amount_pence": 2500,
        "price": 25.0,
        "media_delete_policy": "1_day",
        "description": "Best for a single night out. Media deletes after 24 hours.",
    },
    "extended": {
        "name": "Extended",
        "display_price_gbp": "£55.00",
        "amount_pence": 5500,
        "price": 55.0,
        "media_delete_policy": "1_month",
        "description": "Best for a weekend or longer trip. Media is kept for the month.",
    },
    "prime": {
        "name": "Prime",
        "display_price_gbp": "£95.00",
        "amount_pence": 9500,
        "price": 95.0,
        "media_delete_policy": "never",
        "description": "Best for the full keepsake experience. Media is kept forever.",
    },
}

TIER_TO_APPLE_PRODUCT = {
    "one_day": "com.stagandhen.event.oneday",
    "extended": "com.stagandhen.event.extended",
    "prime": "com.stagandhen.event.prime",
}

APPLE_PRODUCT_TO_TIER = {product_id: tier for tier, product_id in TIER_TO_APPLE_PRODUCT.items()}

APPLE_UPGRADE_PRODUCTS = {
    ("one_day", "extended"): "com.stagandhen.upgrade.onedaytoextended",
    ("one_day", "prime"): "com.stagandhen.upgrade.onedaytoprime",
    ("extended", "prime"): "com.stagandhen.upgrade.extendedtoprime",
}

APPLE_UPGRADE_PRODUCT_TO_TIERS = {
    product_id: tiers for tiers, product_id in APPLE_UPGRADE_PRODUCTS.items()
}

APPLE_PRODUCT_PRICES = {
    product_id: {
        "amount_pence": EVENT_PLANS[tier]["amount_pence"],
        "currency": "gbp",
    }
    for tier, product_id in TIER_TO_APPLE_PRODUCT.items()
}

APPLE_PRODUCT_PRICES.update({
    product_id: {
        "amount_pence": EVENT_PLANS[to_tier]["amount_pence"] - EVENT_PLANS[from_tier]["amount_pence"],
        "currency": "gbp",
    }
    for (from_tier, to_tier), product_id in APPLE_UPGRADE_PRODUCTS.items()
})


def get_public_plan_config():
    return [
        {
            "id": tier,
            "name": plan["name"],
            "display_price_gbp": plan["display_price_gbp"],
            "media_delete_policy": plan["media_delete_policy"],
            "description": plan["description"],
            "apple_product_id": TIER_TO_APPLE_PRODUCT[tier],
        }
        for tier, plan in EVENT_PLANS.items()
    ]
