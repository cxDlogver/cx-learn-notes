import { RefDemo } from "./components/1.Ref";
import { SuspenseDemo } from "./components/3.Suspense/Suspense";
import { HeaderDemo } from "./components/4.memo";
import { UseStateDemo } from "./components/5.useState";
import { UseReducerDemo } from "./components/6.useReducer";
import { UseContextDemo } from "./components/7.useContext";
import { UseEffectDemo } from "./components/8.useEffect";
import { UseMemoUseCallbackDemo } from "./components/9.useMemo-useCallback";
import { UseFetchDemo } from "./components/10.useFetch";
import "./App.css";

function App() {
  return (
    <div>
      <RefDemo />
      <SuspenseDemo />
      <HeaderDemo />
      <UseStateDemo />
      <UseReducerDemo />
      <UseContextDemo />
      <UseEffectDemo />
      <UseMemoUseCallbackDemo />
      <UseFetchDemo />
    </div>
  );
}

export default App;
