import hashlib


def compute_identity_hash(first_name: str, last_name: str, date_of_birth: str) -> str:
    """Deterministic SHA-256 hash of normalized First Name + Last Name + DOB,
    used to detect the same person registering under multiple accounts.
    """
    normalized = f"{(first_name or '').strip().lower()}|{(last_name or '').strip().lower()}|{(date_of_birth or '').strip()}"
    return hashlib.sha256(normalized.encode()).hexdigest()
