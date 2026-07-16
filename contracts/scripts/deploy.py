"""Deploy MockUSDC (local networks only) and Distributor.

This does NOT compile Solidity — run `npx hardhat compile` first. Hardhat's
own toolchain still owns compiling/testing the contracts (that's Node-based
tooling with no practical Python equivalent for this project); this script
only sends the deployment transactions, in Python, reading the compiled
ABI/bytecode straight out of Hardhat's `artifacts/` output.

Usage:
    python3 scripts/deploy.py --network localhost
    python3 scripts/deploy.py --network sepolia   # needs .env: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY
"""
import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = ROOT / "artifacts" / "contracts"
DEPLOYMENTS_DIR = ROOT / "deployments"

LOCAL_NETWORKS = {"hardhat", "localhost"}
LOCAL_RPC_URL = "http://127.0.0.1:8545"
# Hardhat's default account #0 — publicly known, funded only on local test nodes.
LOCAL_DEV_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
SEPOLIA_USDC_DEFAULT = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
LOCAL_MOCK_MINT_AMOUNT = 1_000_000_000_000  # 1,000,000 mUSDC (6 decimals)


def load_artifact(contract_name: str) -> dict:
    path = ARTIFACTS_DIR / f"{contract_name}.sol" / f"{contract_name}.json"
    with open(path) as f:
        return json.load(f)


def get_w3_and_account(network: str):
    if network in LOCAL_NETWORKS:
        rpc_url = LOCAL_RPC_URL
        private_key = os.getenv("DEPLOYER_PRIVATE_KEY") or LOCAL_DEV_PRIVATE_KEY
    else:
        rpc_url = os.environ["SEPOLIA_RPC_URL"]
        private_key = os.environ["DEPLOYER_PRIVATE_KEY"]
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    account = w3.eth.account.from_key(private_key)
    return w3, account


def send_and_wait(w3: Web3, account, fn) -> dict:
    nonce = w3.eth.get_transaction_count(account.address)
    gas_estimate = fn.estimate_gas({"from": account.address})
    tx = fn.build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": int(gas_estimate * 1.2),
        "gasPrice": w3.eth.gas_price,
    })
    signed = account.sign_transaction(tx)
    raw = getattr(signed, "raw_transaction", None)
    if raw is None:
        raw = signed.rawTransaction
    tx_hash = w3.eth.send_raw_transaction(raw)
    return w3.eth.wait_for_transaction_receipt(tx_hash)


def deploy_contract(w3: Web3, account, artifact: dict, constructor_args: list):
    contract = w3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"])
    receipt = send_and_wait(w3, account, contract.constructor(*constructor_args))
    return receipt["contractAddress"], artifact["abi"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--network", required=True, choices=["hardhat", "localhost", "sepolia"])
    args = parser.parse_args()
    network = args.network

    w3, account = get_w3_and_account(network)
    print(f"Deploying to network: {network}")
    print(f"Deployer: {account.address}")

    deployment = {"network": network, "contracts": {}}

    if network in LOCAL_NETWORKS:
        mock_usdc_artifact = load_artifact("MockUSDC")
        usdc_address, usdc_abi = deploy_contract(w3, account, mock_usdc_artifact, [account.address])
        print(f"MockUSDC deployed at: {usdc_address}")
        deployment["contracts"]["MockUSDC"] = {"address": usdc_address, "abi": usdc_abi}

        usdc_contract = w3.eth.contract(address=usdc_address, abi=usdc_abi)
        send_and_wait(w3, account, usdc_contract.functions.mint(account.address, LOCAL_MOCK_MINT_AMOUNT))
    else:
        usdc_address = os.getenv("USDC_ADDRESS_SEPOLIA", SEPOLIA_USDC_DEFAULT)
        print(f"Using USDC token address: {usdc_address}")

    distributor_artifact = load_artifact("Distributor")
    distributor_address, distributor_abi = deploy_contract(
        w3, account, distributor_artifact, [usdc_address, account.address]
    )
    print(f"Distributor deployed at: {distributor_address}")
    deployment["contracts"]["Distributor"] = {"address": distributor_address, "abi": distributor_abi}

    DEPLOYMENTS_DIR.mkdir(exist_ok=True)
    out_file = DEPLOYMENTS_DIR / f"{network}.json"
    with open(out_file, "w") as f:
        json.dump(deployment, f, indent=2)
    print(f"Wrote deployment info to: {out_file}")


if __name__ == "__main__":
    main()
