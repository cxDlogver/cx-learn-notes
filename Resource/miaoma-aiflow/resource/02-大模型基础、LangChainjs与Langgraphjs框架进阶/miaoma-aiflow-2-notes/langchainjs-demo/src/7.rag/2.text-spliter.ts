import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 8,
  chunkOverlap: 0,
});

const longTextDocument = new Document({
  pageContent: "heyi 成绩是多少？heyi 成绩是多少？heyi 成绩是多少？",
  metadata: {
    source: "student.csv",
  },
});

const splitText = async (document: Document) => {
  //   const texts = await splitter.splitText(document.pageContent);
  const chunks = await splitter.createDocuments([document.pageContent]);

  console.log("🚀 ~ chunks:", chunks);

  return chunks;
};

splitText(longTextDocument);
