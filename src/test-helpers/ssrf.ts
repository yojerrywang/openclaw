import { vi } from "vitest";
import * as ssrf from "../infra/net/ssrf.js";

export function mockPinnedHostnameResolution(addresses: string[] = ["93.184.216.34"]) {
  const lookupResults = addresses.map((address) => ({
    address,
    family: address.includes(":") ? 6 : 4,
  })) as Array<{ address: string; family: number }>;

  const lookupFn = async () => lookupResults;

  const resolvePinnedHostnameOriginal = ssrf.resolvePinnedHostname;
  const resolvePinnedHostnameWithPolicyOriginal = ssrf.resolvePinnedHostnameWithPolicy;

  // Newer code paths call resolvePinnedHostnameWithPolicy while older paths still
  // call resolvePinnedHostname directly. Mock both so media tests stay stable
  // across SSRF-guard refactors.
  vi.spyOn(ssrf, "resolvePinnedHostnameWithPolicy").mockImplementation(async (hostname, params) => {
    return await resolvePinnedHostnameWithPolicyOriginal(hostname, {
      ...params,
      lookupFn,
    });
  });
  return vi.spyOn(ssrf, "resolvePinnedHostname").mockImplementation(async (hostname) => {
    return await resolvePinnedHostnameOriginal(hostname, lookupFn);
  });
}
