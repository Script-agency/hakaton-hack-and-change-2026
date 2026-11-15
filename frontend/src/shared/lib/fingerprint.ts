import FingerprintJS from "@fingerprintjs/fingerprintjs";

import { FingerprintError } from "./fingerprint-error";

let fingerprintPromise: Promise<string> | undefined;

export const getFingerprint = (): Promise<string> => {
  fingerprintPromise ??= FingerprintJS.load({ monitoring: false })
    .then((agent) => agent.get())
    .then(({ visitorId }) => {
      if (visitorId.length === 0) {
        throw new Error("Не удалось определить идентификатор браузера.");
      }

      return visitorId;
    })
    .catch((error: unknown) => {
      fingerprintPromise = undefined;
      throw new FingerprintError(error);
    });

  return fingerprintPromise;
};
