from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    pghost: str = "127.0.0.1"
    pgport: int = 5432
    pgdatabase: str = "chainbase"
    pguser: str = ""
    pgpassword: str = ""

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 1 week

    # Blockchain / disbursement automation
    rpc_url: str = "http://127.0.0.1:8545"
    deployer_private_key: str = ""
    chain_network: str = "localhost"  # selects contracts/deployments/<chain_network>.json
    cycle_amount_per_recipient: float = 500.00
    scheduler_enabled: bool = False  # opt-in: requires a chain deployment + rpc_url/deployer_private_key configured
    disbursement_cron_day: int = 1
    disbursement_cron_hour: int = 0

    # Didit identity verification
    didit_enabled: bool = False  # opt-in: requires a Didit sandbox/live account (business.didit.me)
    didit_api_key: str = ""
    didit_workflow_id: str = ""
    didit_webhook_secret: str = ""
    didit_base_url: str = "https://apx.didit.me"
    didit_wallet_rotation_workflow_id: str = ""  # optional lightweight selfie-only workflow; falls back to didit_workflow_id

    # Embedded wallet provisioning (MetaMask Embedded Wallets / Web3Auth, Custom JWT mode)
    wallet_provisioning_enabled: bool = False  # opt-in: requires a MetaMask Embedded Wallets project + signing key below
    wallet_jwt_private_key: str = ""  # RSA private key PEM, \n-escaped in .env
    wallet_jwt_issuer: str = ""       # must match the "iss" validation configured in the dashboard's Custom JWT connection
    wallet_jwt_audience: str = ""     # the Embedded Wallets project's Client ID
    wallet_client_secret: str = ""    # captured for future management-API use; not needed for the Custom JWT connect flow itself

    @property
    def wallet_jwt_private_key_pem(self) -> str:
        return self.wallet_jwt_private_key.replace("\\n", "\n")


settings = Settings()
