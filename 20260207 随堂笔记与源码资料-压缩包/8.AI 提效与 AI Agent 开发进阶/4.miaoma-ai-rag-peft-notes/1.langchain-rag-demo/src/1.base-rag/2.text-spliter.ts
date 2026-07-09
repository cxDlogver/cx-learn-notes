import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { loadDocument } from "./1.loader-csv";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 3,
  chunkOverlap: 1,
  separators: ["，"]
});

export const splitText = async () => {
  const doc = await loadDocument();

    // const docs = await splitter.createDocuments(doc[0].pageContent);
    // console.log('🚀 ~ splitText ~ docs:', doc)
  const chunks = await splitter.splitText(doc[0].pageContent);

  //   console.log(chunks);

  return chunks;
};

// splitText();
