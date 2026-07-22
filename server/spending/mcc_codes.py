RESTRICTED = {
    "5921": "alcohol",    # Package Stores — Beer, Wine, Liquor
    "5813": "alcohol",    # Bars and Cocktail Lounges
    "5912": "alcohol",    # Drug Stores (often sell alcohol)
    "5993": "tobacco",    # Cigar Stores and Stands
    "7995": "gambling",   # Betting / Casino Gambling
    "7801": "gambling",   # Government-Licensed Casinos
    "7802": "gambling",   # Government-Licensed Horse/Dog Racing
}

SAMPLE_MCCS = {
    "5411": "grocery",
    "5812": "restaurant",
    "5541": "gas_station",
    "5999": "retail",
    "7011": "hotel",
    "4111": "transit",
    **{k: v for k, v in RESTRICTED.items()},
}


def get_category(mcc: str) -> str:
    return SAMPLE_MCCS.get(mcc, "other")


def is_restricted(mcc: str) -> bool:
    return mcc in RESTRICTED
