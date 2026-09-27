import { Linking } from "react-native";

export interface LinkSource {
  initialUrl(): Promise<string | null>;
  subscribe(listener: (url: string) => void): () => void;
}

export const nativeLinks: LinkSource = {
  initialUrl: () => Linking.getInitialURL(),
  subscribe: (listener) => {
    const subscription = Linking.addEventListener("url", ({ url }) =>
      listener(url),
    );
    return () => subscription.remove();
  },
};
