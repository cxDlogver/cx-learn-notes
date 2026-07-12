/// <reference types="vite/client" />

declare module "*.module.css" {
  const classNames: Record<"h1", string>;
  export default classNames;
}

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
