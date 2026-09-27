import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppServicesContext, createAppServices } from "./data/services";
import { AppNavigation } from "./navigation/navigation";

export default function App() {
  const [services] = useState(createAppServices);
  useEffect(() => {
    void services.session.restore();
  }, [services]);
  return (
    <AppServicesContext.Provider value={services}>
      <QueryClientProvider client={services.queryClient}>
        <AppNavigation />
      </QueryClientProvider>
    </AppServicesContext.Provider>
  );
}
