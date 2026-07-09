import { useState, useEffect, useTransition } from "react";
import Contact from "./Contact";

const About = () => {
  const [count, setCount] = useState(0);

  const [isPending, startTransition] = useTransition();

  const startTransitionCount = () => {
    startTransition(() => {
      setCount(count + 1);
    });
  };

  useEffect(() => {
    console.log(count);
    startTransitionCount();
    let c = 0;
    for (let i = 0; i < 10000; i++) {
      c += i;
    }
    setCount(c);
  }, [count]);
  return (
    <div>
      {isPending && <div>isPending...</div>}
      {count && (
        <img
          alt="About"
          src="https://react.dev/images/docs/performance-tracks/scheduler.png"
        />
      )}
      <h1>About {count}</h1>
      <Contact />
    </div>
  );
};
export default About;
