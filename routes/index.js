const { OpenAI } = require("langchain/llms/openai");

//Import the Vector DB QA chain
const { VectorDBQAChain } = require("langchain/chains");

//const the Hierarchical Navigable Small World Graphs vector store (you'll learn
//how it is used later in the code)
// const { PineconeStore } = require("langchain/vectorstores/pinecone");
// const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { HNSWLib } = require("langchain/vectorstores/hnswlib");

//const OpenAI embeddings (you'll learn
//how it is used later in the code)
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");

//const the text splitter (you'll learn
//how it is used later in the code)
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { initializeAgentExecutorWithOptions } = require("langchain/agents");
const { SerpAPI } = require("langchain/tools");
const { Calculator } = require("langchain/tools/calculator");
const Build = require('newspaperjs').Build;
const Article = require('newspaperjs').Article

const pdfjs = require('pdfjs-dist');
// import { PdfReader } from "pdfreader";
//const file stystem node module
const fs = require("fs");
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', async function (req, res, next) {
  //Import the OpenAPI Large Language Model (you can import other models here eg. Cohere)

  //Load environment variables (populate process.env from .env file)
  const { docs } = req.body
  const model = new OpenAI({ openAIApiKey: "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", temperature: 0.9 });

  const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings({ openAIApiKey: "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" }));

  //Create the LangChain.js chain consting of the LLM and the vector store
  const chain = VectorDBQAChain.fromLLM(model, vectorStore);
  //Ask the question that will use content from the file to find the answer
  //The way this all comes together is that when the following call is made, the "query" (question) is used to
  //search the vector store to find chunks of text that is similar to the text in the "query" (question). Those
  //chunks of text are then sent to the LLM to find the answer to the "query" (question). This is done because,
  //as explained earlier, the LLMs have a limit in size of the text that can be sent to them
  const ress = await chain.call({
    input_documents: docs,
    query: "what is it about?",
  });
  console.log({ ress });
  res.json({ ress });

});
router.get('/pdf', async function (req, res, next) {
  //Import the OpenAPI Large Language Model (you can import other models here eg. Cohere)

  //Load environment variables (populate process.env from .env file)
  const pdfPath = 'koingprogress.pdf';
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument(data);
  let pdfText = []

  try {
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      pdfText.push(pageText)
      console.log(`Page ${pageNumber}: ${pageText}`);
    }
  } catch (error) {
  }
  // Create a new PDFReader instance



  //Instantiante the OpenAI LLM that will be used to answer the question
  const model = new OpenAI({ openAIApiKey: "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", temperature: 0.9 });

  //Load in the file containing the content on which we will be performing Q&A
  //The answers to the questions are contained in this file
  const text = fs.readFileSync("file.txt", "utf8");

  //Split the text from the Q&A content file into chunks
  //This is necessary because we can only pass text of a specifc size to LLMs.  
  //Since the size of the of the file containing the answers is larger than the max size
  //of the text that can be passed to an LLM, we split the the text in the file into chunks.
  //That is what the RecursiveCharacterTextSplitter is doing here
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });

  //Create documents from the split text as required by subsequent calls
  const docs = await textSplitter.createDocuments(pdfText);

  //Create the vector store from OpenAIEmbeddings
  //OpenAIEmbeddings is used to create a vector representation of a text in the documents.
  //Converting the docs to the vector format and storing it in the vectorStore enables LangChain.js
  // console.log("🚀 ~ file: index.js:53 ~ HNSWLib:", PineconeStore)
  //to perform similarity searches on the "await chain.call"
  // const vectorStore = await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings({ openAIApiKey: "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" }), { textKey: "as", pineconeIndex: pinecone.Index("example-index") });
  const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings({ openAIApiKey: "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" }));

  //Create the LangChain.js chain consting of the LLM and the vector store
  const chain = VectorDBQAChain.fromLLM(model, vectorStore);

  //Ask the question that will use content from the file to find the answer
  //The way this all comes together is that when the following call is made, the "query" (question) is used to
  //search the vector store to find chunks of text that is similar to the text in the "query" (question). Those
  //chunks of text are then sent to the LLM to find the answer to the "query" (question). This is done because,
  //as explained earlier, the LLMs have a limit in size of the text that can be sent to them

  res.json({ docs });

});
router.get('/websearch', async function (req, res, next) {
  const model = new OpenAI({ openAIApiKey: "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", temperature: 0.9 });
  const tools = [
    new SerpAPI("key", {
      location: "Austin,Texas,United States",
      hl: "en",
      gl: "us",
    }),
    new Calculator(),
  ];
  // const tools = [
  //   new SerpAPI("1df9985297823110ea3c8973de79b440ca773fe788abbfdf965582c558c284b8", {
  //     location: "Austin,Texas,United States",
  //     hl: "en",
  //     gl: "us",
  //   }),
  //   new Calculator(),
  // ];

  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "zero-shot-react-description",
  });
  console.log("Loaded agent.");

  const input =
    "Who is Olivia Wilde's boyfriend?" +
    " What is his current age raised to the 0.23 power?";
  console.log(`Executing with input "${input}"...`);

  const result = await executor.call({ input });

  console.log(`Got output ${result.output}`);


});
router.get('/newspaper', async function (req, res, next) {
  Article(req.body.url)
    .then(result => {
      console.log(result);
      res.json({ result })
    }).catch(reason => {
      console.log(reason);
    })


});


module.exports = router;
