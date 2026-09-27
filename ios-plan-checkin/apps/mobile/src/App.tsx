import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Network from "expo-network";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";
import { AppServicesContext, createAppServices } from "./data/services";
import { AppNavigation } from "./navigation/navigation";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [services] = useState(createAppServices);
  useEffect(() => {
    services.outbox?.start();
    services.mediaRunner?.start();
    services.reminders?.start();
    const wake = () => {
      void (async () => {
        await services.outbox?.trigger().catch(() => {});
        await services.incrementalSync?.trigger().catch(() => {});
        await services.mediaRunner?.trigger().catch(() => {});
        await services.reminders?.trigger().catch(() => {});
      })();
    };
    void services.session.restore().then(wake);
    const sessionSubscription = services.session.subscribe(() => {
      if (services.session.getSnapshot().phase === "authenticated") wake();
      else void services.reminders?.trigger().catch(() => {});
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
      services.reminders?.stop();
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
