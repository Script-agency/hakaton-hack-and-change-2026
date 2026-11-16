import type { PropsWithChildren } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { MotionProvider } from "./motion-provider";

interface AppProvidersProps extends PropsWithChildren {
  queryClient: QueryClient;
}

export const AppProviders = ({ children, queryClient }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>
      </MotionProvider>
    </QueryClientProvider>
  );
};
