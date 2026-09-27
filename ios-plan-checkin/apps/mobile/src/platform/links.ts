import { Linking } from "react-native";

export interface LinkSource {
  initialUrl(): Promise<string | null>;
  subscribe(listener: (url: string) => void): () => void;
  openExternal(url: string): Promise<void>;
}

export const nativeLinks: LinkSource = {
  initialUrl: () => Linking.getInitialURL(),
  subscribe: (listener) => {
    const subscription = Linking.addEventListener("url", ({ url }) =>
      listener(url),
    );
    return () => subscription.remove();
  },
  openExternal: (url) => Linking.openURL(url),
};
