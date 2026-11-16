import { expect, test, vi } from "vitest";

const { load, get } = vi.hoisted(() => ({ load: vi.fn(), get: vi.fn() }));
vi.mock("@fingerprintjs/fingerprintjs", () => ({ default: { load } }));

test("fingerprint shares pending work, retries failures, disables monitoring and caches success", async () => {
  const { getFingerprint } = await import("./fingerprint");
  load.mockResolvedValue({ get });
  get.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce({ visitorId: "browser-id" });

  const first = getFingerprint();
  expect(getFingerprint()).toBe(first);
  await expect(first).rejects.toMatchObject({ name: "FingerprintError", cause: { message: "Unavailable" } });

  const retry = getFingerprint();
  expect(retry).not.toBe(first);
  await expect(retry).resolves.toBe("browser-id");
  expect(getFingerprint()).toBe(retry);
  expect(load).toHaveBeenCalledTimes(2);
  expect(load).toHaveBeenCalledWith({ monitoring: false });
});
