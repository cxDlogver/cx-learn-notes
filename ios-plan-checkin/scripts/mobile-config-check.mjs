import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const app = (await json("../apps/mobile/app.json")).expo;
const mobile = await json("../apps/mobile/package.json");
const bundled = await json(
  "../apps/mobile/node_modules/expo/bundledNativeModules.json",
);
const plugins = new Map(
  app.plugins.map((item) => (Array.isArray(item) ? item : [item, {}])),
);
const requiredModules = [
  "expo-dev-client",
  "expo-sqlite",
  "expo-secure-store",
  "expo-notifications",
  "expo-image-picker",
  "expo-file-system",
  "expo-crypto",
  "react-native-screens",
  "react-native-safe-area-context",
  "@react-native-community/datetimepicker",
];

for (const moduleName of requiredModules) {
  const declared = mobile.dependencies[moduleName];
  const expected = bundled[moduleName];
  if (!declared || !expected || declared !== expected) {
    throw new Error(
      `${moduleName} must match the installed Expo SDK compatibility map (${expected}).`,
    );
  }
}

for (const pluginName of [
  "expo-dev-client",
  "expo-sqlite",
  "expo-secure-store",
  "expo-notifications",
  "expo-image-picker",
]) {
  if (!plugins.has(pluginName))
    throw new Error(`Missing native config plugin: ${pluginName}`);
}

if (plugins.get("expo-sqlite")?.useSQLCipher !== true) {
  throw new Error("SQLCipher must be enabled for the iOS development build.");
}
if (
  !app.ios?.bundleIdentifier ||
  !app.ios?.infoPlist?.NSUserNotificationsUsageDescription
) {
  throw new Error(
    "Missing iOS bundle identifier or notification purpose text.",
  );
}

process.stdout.write("Expo SDK native module and iOS config check passed.\n");
