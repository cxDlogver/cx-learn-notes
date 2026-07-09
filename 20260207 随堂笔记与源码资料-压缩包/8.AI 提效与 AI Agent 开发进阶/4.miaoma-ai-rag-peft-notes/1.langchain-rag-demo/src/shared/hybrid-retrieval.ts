import type { RagDocument } from "./rag-format";

type MergeHybridResultsInput = {
  vectorResults: RagDocument[];
  keywordResults: RagDocument[];
  maxResults?: number;
};

const documentKey = (document: RagDocument) => {
  const source = document.metadata?.source ?? "";
  return `${String(source)}::${document.pageContent}`;
};

export const mergeHybridResults = ({
  vectorResults,
  keywordResults,
  maxResults = 4,
}: MergeHybridResultsInput) => {
  const seen = new Set<string>();
  const merged: RagDocument[] = [];

  for (const document of [...vectorResults, ...keywordResults]) {
    const key = documentKey(document);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(document);

    if (merged.length >= maxResults) {
      break;
    }
  }

  return merged;
};

const tokenize = (query: string) =>
  query
    .toLowerCase()
    .split(/[\s,，。！？?;；:：]+/)
    .map((term) => term.trim())
    .filter(Boolean);

export const keywordSearchDocuments = (
  documents: RagDocument[],
  query: string,
  maxResults = 4
) => {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }

  return documents
    .map((document) => {
      const content = document.pageContent.toLowerCase();
      const score = terms.reduce(
        (total, term) => total + (content.includes(term) ? 1 : 0),
        0
      );

      return { document, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, maxResults)
    .map(({ document }) => document);
};
