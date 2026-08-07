import { config } from "../config";

type GraphTokenResponse = {
  access_token: string;
};

export async function getGraphAccessToken(): Promise<string> {
  if (!config.azure.tenantId || !config.azure.clientId || !config.azure.clientSecret) {
    throw new Error("Azure credentials are missing. Configure AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET.");
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${config.azure.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.azure.clientId,
    client_secret: config.azure.clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default"
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Graph auth failed: ${response.status} ${details}`);
  }

  const data = (await response.json()) as GraphTokenResponse;
  return data.access_token;
}

export async function graphRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getGraphAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Graph request failed: ${response.status} ${details}`);
  }

  return (await response.json()) as T;
}
