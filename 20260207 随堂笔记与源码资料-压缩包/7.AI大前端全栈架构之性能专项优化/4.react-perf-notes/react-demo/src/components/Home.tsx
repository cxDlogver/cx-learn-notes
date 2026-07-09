import { useEffect, useState } from "react";

const Home = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const cTest = () => {
      console.log(count);
    };
    const test = () => {
      console.log(count);
      let c = 0;
      for (let i = 0; i < 100; i++) {
        c += i;
        cTest();
      }
      setCount(c);
    };

    test();
  }, [count]);
  return <h1>Home {count}</h1>;
};

export default Home;
