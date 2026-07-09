// token、少量数据缓存， localStorage
// 序列化问题
localStorage.setItem("key", JSON.stringify({ name: "heyi" }));
const keyStr = localStorage.getItem("key");
JSON.parse(keyStr);

const obj = {
  name: "heyi",
  hobby: ["篮球", "排球"],
  info: {
    age: 18,
  },
};
const serialize = (json) => {
  // Handle null case
  if (json === null) return "null";
  // Handle undefined case
  if (json === undefined) return "undefined";

  // Handle primitive types
  const type = typeof json;
  if (type === "string") return `"${json.replace(/"/g, '\\"')}"`;
  if (type === "number" || type === "boolean") return String(json);

  // Handle arrays
  if (Array.isArray(json)) {
    const elements = json.map((item) => serialize(item));
    return `[${elements.join(",")}]`;
  }

  // Handle plain objects
  if (type === "object") {
    const pairs = [];
    for (const key in json) {
      if (json.hasOwnProperty(key)) {
        const keyStr = `"${key.replace(/"/g, '\\"')}"`;
        const valueStr = serialize(json[key]);
        pairs.push(`${keyStr}:${valueStr}`);
      }
    }
    return `{${pairs.join(",")}}`;
  }

  // Fallback for unsupported types
  return "";
};

const deserialize = (str) => {
  // Handle null and undefined cases
  if (str === "null") return null;
  if (str === "undefined") return undefined;

  // Handle boolean values
  if (str === "true") return true;
  if (str === "false") return false;

  // Handle number values
  if (!isNaN(Number(str))) return Number(str);

  // Handle string values (remove surrounding quotes and unescape)
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1).replace(/\\"/g, '"');
  }

  // Handle arrays
  if (str.startsWith("[") && str.endsWith("]")) {
    const content = str.slice(1, -1);
    const elements = splitTopLevel(content, ",");
    return elements.map((el) => deserialize(el.trim()));
  }

  // Handle plain objects
  if (str.startsWith("{") && str.endsWith("}")) {
    const content = str.slice(1, -1);
    const pairs = splitTopLevel(content, ",");
    const obj = {};
    for (const pair of pairs) {
      const [keyStr, ...valueParts] = splitTopLevel(pair.trim(), ":");
      const valueStr = valueParts.join(":");
      const key = deserialize(keyStr.trim());
      const value = deserialize(valueStr.trim());
      obj[key] = value;
    }
    return obj;
  }

  // Fallback for invalid input
  return undefined;
};

// Helper function to split string only at top-level separators (ignore nested ones)
function splitTopLevel(str, separator) {
  const result = [];
  let current = "";
  let depth = 0;
  let inString = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // Handle string escaping
    if (char === "\\" && inString) {
      current += char + str[i + 1];
      i++;
      continue;
    }

    // Toggle string state
    if (char === '"') {
      inString = !inString;
      current += char;
      continue;
    }

    // Track bracket depth only when not in string
    if (!inString) {
      if (char === "[" || char === "{") depth++;
      if (char === "]" || char === "}") depth--;

      // Split only at top-level separator
      if (char === separator && depth === 0) {
        result.push(current);
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current) result.push(current);
  return result;
}

// JSON.stringify 还是 JSON.parse 都不好，最好自己有序列化工具
const objString = serialize(obj);
localStorage.setItem("heyi", objString);
console.log("🚀 ~ objString:", objString);

const heyi = localStorage.getItem("heyi");
const heyiJson = deserialize(heyi);
console.log("🚀 ~ heyiJson:", heyiJson);
