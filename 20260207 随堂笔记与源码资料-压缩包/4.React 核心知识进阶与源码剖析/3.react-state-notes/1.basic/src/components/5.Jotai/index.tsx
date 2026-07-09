import { useAtomValue, useSetAtom } from "jotai";
import { ageAtom } from "../../atom/ageAtom";
import { nameAtom } from "../../atom/nameAtom";
import { infoAtom } from "../../atom/infoAtom";

const Age = () => {
  const age = useAtomValue(ageAtom);
  return <div>age: {age}</div>;
};

const Name = () => {
  const name = useAtomValue(nameAtom);
  return <div>name: {name}</div>;
};

const Info = () => {
  const info = useAtomValue(infoAtom);
  return <div>info: {JSON.stringify(info)}</div>;
};

export function Jotai() {
  const setAge = useSetAtom(ageAtom);
  const setName = useSetAtom(nameAtom);

  return (
    <div>
      <Age />
      <button onClick={() => setAge((age) => age + 1)}>修改年龄</button>
      <Name />
      <input onChange={(ev) => setName(ev.target.value)} />
      <Info />
    </div>
  );
}
