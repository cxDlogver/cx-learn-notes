import React, { Suspense, useState } from "react";
// 同步导入
// import { FancyButton } from "./FancyButton";
const FancyButton = React.lazy(() => import("./FancyButton"));

import { Header } from "./Header";

export function SuspenseDemo() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Suspense fallback={"loading"}>
        <Header id="the-beatles" />
      </Suspense>
      <button onClick={() => setShow(true)}>显示</button>
      {show && (
        <Suspense fallback={"loading..."}>
          <FancyButton>fancy button</FancyButton>
        </Suspense>
      )}
    </div>
  );
}
