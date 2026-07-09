// src/shared/hybrid-retrieval.ts
var documentKey = (document) => {
  const source = document.metadata?.source ?? "";
  return `${String(source)}::${document.pageContent}`;
};
var mergeHybridResults = ({
  vectorResults,
  keywordResults,
  maxResults = 4
}) => {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
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
var tokenize = (query) => query.toLowerCase().split(/[\s,，。！？?;；:：]+/).map((term) => term.trim()).filter(Boolean);
var keywordSearchDocuments = (documents, query, maxResults = 4) => {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }
  return documents.map((document) => {
    const content = document.pageContent.toLowerCase();
    const score = terms.reduce(
      (total, term) => total + (content.includes(term) ? 1 : 0),
      0
    );
    return { document, score };
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score).slice(0, maxResults).map(({ document }) => document);
};
export {
  keywordSearchDocuments,
  mergeHybridResults
};
