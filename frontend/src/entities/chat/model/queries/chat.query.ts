import { queryOptions } from "@tanstack/react-query";

import { ChatService } from "../../api";
import { adapterChatFromDto } from "../../lib";
import { ChatQueryKeys } from "../query-keys.const";

export const chatQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ChatQueryKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await ChatService.getById(id, signal);

      return adapterChatFromDto(data);
    },
    staleTime: Infinity,
    retry: false,
  });
