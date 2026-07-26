import time

from cryptography.hazmat.primitives import serialization
from jose import jwk, jwt

from core.config import settings

KEY_ID = "chainbase-wallet-signing-key"


def mint_wallet_id_token(recipient_email: str) -> str:
    """Short-lived RS256 JWT vouching for a recipient's identity. MetaMask
    Embedded Wallets verifies it against our JWKS endpoint and deterministically
    provisions the same wallet for the same email every time. Single-purpose —
    never reused as a session/auth token.
    """
    now = int(time.time())
    payload = {
        "sub": recipient_email,
        "email": recipient_email,
        "iss": settings.wallet_jwt_issuer,
        "aud": settings.wallet_jwt_audience,
        "iat": now,
        "exp": now + 300,
    }
    return jwt.encode(
        payload, settings.wallet_jwt_private_key_pem, algorithm="RS256", headers={"kid": KEY_ID}
    )


def public_jwk() -> dict:
    """Derives the public JWK (for /.well-known/jwks.json) from our own private
    key at request time, so only one key value is ever stored and the two can't
    drift apart.
    """
    private_key = serialization.load_pem_private_key(
        settings.wallet_jwt_private_key_pem.encode(), password=None,
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    key = jwk.construct(public_pem.decode(), algorithm="RS256")
    jwk_dict = key.to_dict()
    jwk_dict.update({"use": "sig", "kid": KEY_ID, "alg": "RS256"})
    return jwk_dict
