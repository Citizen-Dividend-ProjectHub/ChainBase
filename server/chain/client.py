import json
from pathlib import Path
from typing import Optional

from web3 import Web3
from web3.logs import DISCARD

from core.config import settings

USDC_DECIMALS = 6
DEPLOYMENTS_DIR = Path(__file__).resolve().parents[2] / "contracts" / "deployments"


def to_token_units(dollars: float) -> int:
    return round(dollars * 10 ** USDC_DECIMALS)


def from_token_units(units: int) -> float:
    return units / 10 ** USDC_DECIMALS


def _load_distributor_deployment(network: str) -> dict:
    path = DEPLOYMENTS_DIR / f"{network}.json"
    with open(path) as f:
        deployment = json.load(f)
    return deployment["contracts"]["Distributor"]


class ChainClient:
    """Synchronous Web3.py wrapper around the Distributor contract.

    Callers on the asyncio side (the scheduler job) should invoke these
    methods via asyncio.to_thread — web3.py itself is blocking.
    """

    def __init__(self):
        info = _load_distributor_deployment(settings.chain_network)
        self.w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
        self.account = self.w3.eth.account.from_key(settings.deployer_private_key)
        self.contract = self.w3.eth.contract(address=info["address"], abi=info["abi"])

    def _send(self, fn) -> dict:
        nonce = self.w3.eth.get_transaction_count(self.account.address)
        gas_estimate = fn.estimate_gas({"from": self.account.address})
        tx = fn.build_transaction({
            "from": self.account.address,
            "nonce": nonce,
            "gas": int(gas_estimate * 1.2),
            "gasPrice": self.w3.eth.gas_price,
        })
        signed = self.account.sign_transaction(tx)
        raw = getattr(signed, "raw_transaction", None)
        if raw is None:
            raw = signed.rawTransaction
        tx_hash = self.w3.eth.send_raw_transaction(raw)
        return self.w3.eth.wait_for_transaction_receipt(tx_hash)

    def pool_balance(self) -> int:
        return self.contract.functions.poolBalance().call()

    def is_eligible(self, address: str) -> bool:
        return self.contract.functions.isEligible(Web3.to_checksum_address(address)).call()

    def enroll(self, address: str) -> dict:
        fn = self.contract.functions.enrollRecipient(Web3.to_checksum_address(address))
        return self._send(fn)

    def revoke(self, address: str) -> dict:
        fn = self.contract.functions.revokeRecipient(Web3.to_checksum_address(address))
        return self._send(fn)

    def disburse_batch(self, cycle_id: int, addresses: list, amount_units: int):
        checksummed = [Web3.to_checksum_address(a) for a in addresses]
        fn = self.contract.functions.disburseBatch(cycle_id, checksummed, amount_units)
        receipt = self._send(fn)

        outcomes = {addr: False for addr in checksummed}
        for event in self.contract.events.Disbursed().process_receipt(receipt, errors=DISCARD):
            outcomes[event["args"]["recipient"]] = True
        for event in self.contract.events.DisbursementSkipped().process_receipt(receipt, errors=DISCARD):
            outcomes[event["args"]["recipient"]] = False

        # Map back to the original (non-checksummed) address strings the caller passed in.
        return receipt, {orig: outcomes[Web3.to_checksum_address(orig)] for orig in addresses}


_chain_client: Optional[ChainClient] = None


def init_chain_client() -> ChainClient:
    global _chain_client
    _chain_client = ChainClient()
    return _chain_client


def get_chain_client() -> ChainClient:
    if _chain_client is None:
        raise RuntimeError("Chain client not initialized.")
    return _chain_client
