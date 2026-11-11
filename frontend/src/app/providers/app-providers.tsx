import type { PropsWithChildren } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { MotionProvider } from "./motion-provider";

interface AppProvidersProps extends PropsWithChildren {
  queryClient: QueryClient;
  initialPath: string;
}

export const AppProviders = ({ children, queryClient, initialPath }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionProvider>
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </MotionProvider>
    </QueryClientProvider>
  );
};
