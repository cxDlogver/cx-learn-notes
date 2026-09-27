import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";
import { AppServicesContext, createAppServices } from "./data/services";
import { AppNavigation } from "./navigation/navigation";

export default function App() {
  const [services] = useState(createAppServices);
  useEffect(() => {
    services.outbox?.start();
    services.mediaRunner?.start();
    const wake = () => {
      void (async () => {
        await services.outbox?.trigger().catch(() => {});
        await services.incrementalSync?.trigger().catch(() => {});
        await services.mediaRunner?.trigger().catch(() => {});
      })();
    };
    void services.session.restore().then(wake);
    const sessionSubscription = services.session.subscribe(() => {
      if (services.session.getSnapshot().phase === "authenticated") wake();
    });
    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) wake();
    });
    const appSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") wake();
    });
    return () => {
      sessionSubscription();
      networkSubscription.remove();
      appSubscription.remove();
      services.outbox?.stop();
      services.mediaRunner?.stop();
    };
  }, [services]);
  return (
    <AppServicesContext.Provider value={services}>
      <QueryClientProvider client={services.queryClient}>
        <AppNavigation />
      </QueryClientProvider>
    </AppServicesContext.Provider>
  );
}
