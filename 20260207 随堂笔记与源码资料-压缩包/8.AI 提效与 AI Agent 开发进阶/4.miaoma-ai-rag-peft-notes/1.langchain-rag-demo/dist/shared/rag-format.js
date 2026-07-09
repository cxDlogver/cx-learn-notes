// src/shared/rag-format.ts
var formatMetadataValue = (value) => {
  if (typeof value !== "object") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
var formatMetadata = (metadata = {}) => {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== void 0 && value !== null && value !== ""
  );
  if (entries.length === 0) {
    return "metadata=none";
  }
  return entries.map(([key, value]) => `${key}=${formatMetadataValue(value)}`).join(" ");
};
var formatDocumentsAsContext = (documents) => {
  if (documents.length === 0) {
    return "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4E0A\u4E0B\u6587\u3002";
  }
  return documents.map((document, index) => {
    const metadata = formatMetadata(document.metadata);
    return `[${index + 1}] ${metadata}
${document.pageContent}`;
  }).join("\n\n");
};
export {
  formatDocumentsAsContext
};
