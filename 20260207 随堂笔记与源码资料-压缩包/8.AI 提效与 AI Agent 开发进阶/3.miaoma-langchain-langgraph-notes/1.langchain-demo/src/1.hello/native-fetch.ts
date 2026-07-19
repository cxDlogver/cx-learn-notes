import "dotenv/config";

const prompt = "豆包，10192039+1235231 等于几？";

const requireEnv = (name: "LLM_MODEL" | "BASE_URL" | "API_KEY") => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少环境变量：${name}`);
  }
  return value;
};

const model = requireEnv("LLM_MODEL");
const baseURL = requireEnv("BASE_URL").replace(/\/$/, "");
const apiKey = requireEnv("API_KEY");
const url = `${baseURL}/chat/completions`;

const requestBody = {
  model,
  messages: [
    {
      role: "user",
      content: prompt,
    },
  ],
};

const invoke = async () => {
  console.log("原生 fetch 请求地址:");
  console.log(url);
  console.log("\n原生 fetch 请求体:");
  console.log(JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.log("\n原生 fetch 响应状态:");
    console.log(`${response.status} ${response.statusText}`);
    console.log("\n原生 fetch 错误响应体:");
    console.log(responseText);
    throw new Error("原生 fetch 调用失败");
  }

  const rawResponse = JSON.parse(responseText);

  console.log("\n原生 fetch 完整响应:");
  console.log(JSON.stringify(rawResponse, null, 2));

  console.log("\n原生 fetch 最终回答 content:");
  console.log(rawResponse.choices?.[0]?.message?.content);
};

invoke();
