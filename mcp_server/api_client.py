import os

import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_API_URL = os.environ["BACKEND_API_URL"]
SERVICE_EMAIL = os.environ["MCP_SERVICE_EMAIL"]
SERVICE_PASSWORD = os.environ["MCP_SERVICE_PASSWORD"]


class BackendClient:
    """
    HTTP client authenticating as the backend's 'service' role user.
    Logs in lazily, and re-authenticates (refresh, falling back to a full
    re-login if the refresh token itself has expired) on a 401 — the same
    pattern the frontend's Axios interceptor uses.
    """

    def __init__(self):
        self._client = httpx.Client(base_url=BACKEND_API_URL, timeout=15.0)
        self._access_token: str | None = None
        self._refresh_token: str | None = None

    def _login(self) -> None:
        resp = self._client.post(
            "/auth/login",
            json={"email": SERVICE_EMAIL, "password": SERVICE_PASSWORD},
        )
        resp.raise_for_status()
        self._store_tokens(resp.json())

    def _refresh(self) -> None:
        resp = self._client.post(
            "/auth/refresh", json={"refresh_token": self._refresh_token}
        )
        resp.raise_for_status()
        self._store_tokens(resp.json())

    def _store_tokens(self, tokens: dict) -> None:
        self._access_token = tokens["access_token"]
        self._refresh_token = tokens["refresh_token"]

    def _authed_request(self, method: str, path: str, **kwargs) -> httpx.Response:
        headers = {"Authorization": f"Bearer {self._access_token}"}
        return self._client.request(method, path, headers=headers, **kwargs)

    def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        if self._access_token is None:
            self._login()
        resp = self._authed_request(method, path, **kwargs)
        if resp.status_code == 401:
            try:
                self._refresh()
            except httpx.HTTPStatusError:
                self._login()
            resp = self._authed_request(method, path, **kwargs)
        resp.raise_for_status()
        return resp

    def get(self, path: str, params: dict | None = None):
        return self._request("GET", path, params=params).json()

    def post(self, path: str, json: dict):
        return self._request("POST", path, json=json).json()

    def patch(self, path: str, json: dict):
        return self._request("PATCH", path, json=json).json()


backend = BackendClient()
