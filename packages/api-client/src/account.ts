import type { OpenSunsamaClient } from "./client.js";

export interface AccountDevice {
  id: string;
  clientDeviceId: string;
  platform: "web" | "desktop" | "android" | "ios";
  displayName: string;
  createdAt: string;
  lastActiveAt: string;
  lastSuccessfulSyncAt: string | null;
  revokedAt: string | null;
}
export interface AccountSession {
  id: string;
  deviceId: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}
export interface AccountIdentity { provider: string; emailAtLink: string | null; emailVerifiedAtLink: string | null; createdAt: string; }
interface Response<T> { success: boolean; data: T; }

export function createAccountApi(client: OpenSunsamaClient) {
  return {
    async devices(): Promise<AccountDevice[]> {
      return (await client.get<Response<AccountDevice[]>>("account/devices")).data;
    },
    async registerDevice(input: Pick<AccountDevice, "clientDeviceId" | "platform" | "displayName">): Promise<AccountDevice> {
      return (await client.post<Response<AccountDevice>>("account/devices", input)).data;
    },
    async identities(): Promise<AccountIdentity[]> {
      return (await client.get<Response<AccountIdentity[]>>("account/identities")).data;
    },
    async revokeDevice(id: string): Promise<void> {
      await client.delete<Response<void>>(`account/devices/${id}`);
    },
    async sessions(): Promise<AccountSession[]> {
      return (await client.get<Response<AccountSession[]>>("account/sessions")).data;
    },
    async revokeSession(id: string): Promise<void> {
      await client.delete<Response<void>>(`account/sessions/${id}`);
    },
  };
}
