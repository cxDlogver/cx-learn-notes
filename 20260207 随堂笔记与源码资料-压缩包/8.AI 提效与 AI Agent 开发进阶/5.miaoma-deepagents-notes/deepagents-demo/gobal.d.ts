declare namespace NodeJS {
  interface ProcessEnv {
    NAME: string;
    LLM_MODEL: string;
    API_KEY: string;
    BASE_URL: string;
  }
}
