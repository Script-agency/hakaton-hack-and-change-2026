import { queryOptions } from "@tanstack/react-query";

import { DialogService } from "../../api";
import { adapterDialogFromDto } from "../../lib";
import { DialogQueryKeys } from "../query-keys.const";

export const dialogsQueryOptions = (fingerprint: string) =>
  queryOptions({
    queryKey: DialogQueryKeys.list(fingerprint),
    queryFn: async ({ signal }) => {
      const { data } = await DialogService.getAll(fingerprint, signal);

      return data.map(adapterDialogFromDto);
    },
    retry: false,
  });
