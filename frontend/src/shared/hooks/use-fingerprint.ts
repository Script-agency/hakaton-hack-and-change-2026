import { useQuery } from "@tanstack/react-query";

import { getFingerprint } from "@shared/lib";

export const useFingerprint = (enabled = true) =>
  useQuery({
    queryKey: ["fingerprint"],
    queryFn: getFingerprint,
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
