import { useState } from "react";

export function Basic() {
  const [path, setPath] = useState("/");

  const renderView = (path: string) => {
    switch (path) {
      case "/":
        return <div>index</div>;
      case "/home":
        return <div>home</div>;
      case "/detail":
        return <div>detail</div>;
      case "/issue":
        return <div>issue</div>;

      default:
        break;
    }
  };

  return (
    <div>
      <div>
        <button onClick={() => setPath("/home")}>/home</button>
        <button onClick={() => setPath("/detail")}>/detail</button>
        <button onClick={() => setPath("/issue")}>/issue</button>
      </div>
      <div>{renderView(path)}</div>
    </div>
  );
}
