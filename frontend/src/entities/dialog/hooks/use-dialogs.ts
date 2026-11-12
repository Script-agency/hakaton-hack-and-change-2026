import { useQuery } from "@tanstack/react-query";

import { DialogMockService } from "../api";

const dialogsKey = ["dialog", "list"] as const;

export const useDialogs = (isActive = true) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: dialogsKey,
    enabled: isActive,
    queryFn: ({ signal }) => DialogMockService.getDialogs(signal),
  });

  const retry = () => {
    void refetch();
  };

  return {
    dialogs: data ?? [],
    isLoading: isPending,
    hasError: isError,
    retry,
  };
};
