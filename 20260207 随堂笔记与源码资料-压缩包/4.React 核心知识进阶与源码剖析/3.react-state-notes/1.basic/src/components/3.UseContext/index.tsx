import { useCallback, useState } from "react";
import { LangContext } from "../../contexts/LangContext";
import { useLang } from "../../hooks/useLang";

// const LangContext = createContext("en");

const A = () => {
  return <B></B>;
};
const B = () => {
  return <C></C>;
};
const C = () => {
  return <D></D>;
};
// const D = () => {
//   return (
//     <div>
//       d 123
//       <LangContext.Consumer>{(ctx) => <div>{ctx}</div>}</LangContext.Consumer>
//     </div>
//   );
// };
const D = () => {
  const ctx = useLang();
  return (
    <div>
      d 123
      {ctx}
    </div>
  );
};

export function UseContext() {
  const [lang, setLange] = useState("en");
  const handleClick = useCallback(() => {
    setLange((lang) => (lang === "cn" ? "en" : "cn"));
  }, []);
  return (
    <div>
      <div>{lang}</div>
      <button onClick={handleClick}>修改语言</button>
      <LangContext.Provider value={lang}>
        <A />
      </LangContext.Provider>
    </div>
  );
}
