import type { PropsWithChildren } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

interface AppProvidersProps extends PropsWithChildren {
  queryClient: QueryClient;
  initialPath: string;
}

export const AppProviders = ({ children, queryClient, initialPath }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};
