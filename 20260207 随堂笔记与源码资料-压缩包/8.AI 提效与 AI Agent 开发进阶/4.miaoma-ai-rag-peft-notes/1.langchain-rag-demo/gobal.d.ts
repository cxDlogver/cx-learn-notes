declare namespace NodeJS {
  interface ProcessEnv {
    LLM_MODEL: string;
    EMBEDDING_MODEL: string;
    API_KEY: string;
    BASE_URL: string;
  }
}
