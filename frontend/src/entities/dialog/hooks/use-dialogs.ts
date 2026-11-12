import { useQuery } from "@tanstack/react-query";

import { DialogMockService } from "../api";

const dialogsKey = ["dialog", "list"] as const;

export const useDialogs = () => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: dialogsKey,
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
