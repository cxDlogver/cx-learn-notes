// document.body.style.backgroundColor = "red";
import { useState } from "react";

console.log("🚀 ~ import.meta.env.MIAOMA:", import.meta.env.VITE_MIAOMA);

const Header = () => {
  const [count, setCount] = useState(0);
  return (
    <div onClick={() => setCount(count + 1)}>
      :simle:
      Header {import.meta.env.VITE_MIAOMA} {count}
    </div>
  );
};

export default Header;
