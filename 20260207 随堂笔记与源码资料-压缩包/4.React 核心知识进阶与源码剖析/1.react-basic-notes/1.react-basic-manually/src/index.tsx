// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PropsDemo } from "./components/1.props";
import { StateDemo } from "./components/2.state";
import { ConditionDemo } from "./components/3.condition";
import { EventDemo } from "./components/4.event";
import { ListDemo } from "./components/5.list";
import { FormDemo } from "./components/6.form";
import { NewFormDemo } from "./components/6.newForm";

const app = createRoot(document.getElementById("root")!);
console.log(
  `🚀 ~ document.getElementById("root")!:`,
  document.getElementById("root")!,
);

const user = "heyi";

function getContent() {
  if (user) {
    return <div>妙码 {user}</div>;
  } else {
    return <div>miaoma</div>;
  }
}

app.render(
  // <StrictMode>
  <div>
    <div>{getContent()}</div>
    <PropsDemo id="123" onClick={() => alert(1)}>
      <button>点我</button>
    </PropsDemo>
    <StateDemo />
    <ConditionDemo />
    <EventDemo onClick={() => alert("点了")} />
    <ListDemo />
    <FormDemo />
    <NewFormDemo />
  </div>,
  // </StrictMode>,
);
