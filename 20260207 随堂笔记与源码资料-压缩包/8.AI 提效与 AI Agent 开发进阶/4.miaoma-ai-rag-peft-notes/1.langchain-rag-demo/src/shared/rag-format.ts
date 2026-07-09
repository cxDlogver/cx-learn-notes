export type RagDocument = {
  pageContent: string;
  metadata?: Record<string, unknown>;
};

const formatMetadataValue = (value: unknown) => {
  if (typeof value !== "object") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatMetadata = (metadata: Record<string, unknown> = {}) => {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

  if (entries.length === 0) {
    return "metadata=none";
  }

  return entries
    .map(([key, value]) => `${key}=${formatMetadataValue(value)}`)
    .join(" ");
};

export const formatDocumentsAsContext = (documents: RagDocument[]) => {
  if (documents.length === 0) {
    return "未检索到相关上下文。";
  }

  return documents
    .map((document, index) => {
      const metadata = formatMetadata(document.metadata);
      return `[${index + 1}] ${metadata}\n${document.pageContent}`;
    })
    .join("\n\n");
};
