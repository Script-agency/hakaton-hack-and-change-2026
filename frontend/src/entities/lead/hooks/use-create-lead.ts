import { useMutation } from "@tanstack/react-query";

import { LeadService } from "../api";
import { adapterLeadFromDto } from "../lib";
import { finishLeadRequest } from "../model";
import type { CreateLeadVariables } from "../types";

export const useCreateLead = () =>
  useMutation({
    mutationKey: ["lead", "create"],
    retry: false,
    mutationFn: async ({ request, controller }: CreateLeadVariables) => {
      const { data } = await LeadService.create(request, controller.signal);

      return adapterLeadFromDto(data.item);
    },
    onSettled: (_data, _error, { controller }) => finishLeadRequest(controller),
  });
