import { useEffect, useRef, useState } from "react";

export const RefDemo = () => {
  // createRef
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const listRef = useRef<(HTMLDivElement | null)[]>([]);

  const [time, setTime] = useState(0);

  const countRef = useRef<number>(0);

  useEffect(() => {
    // const canvasDom = document.querySelector("#canvas");
    // console.log("🚀 ~ RefDemo ~ canvasDom:", canvasDom);
    const canvasDom = canvasRef.current;

    if (!canvasDom) return;

    const ctx = canvasDom.getContext("2d");

    ctx?.beginPath();
    ctx?.moveTo(0, 0);
    ctx?.lineTo(100, 100);
    ctx?.stroke();
    ctx?.closePath();

    console.log("listRef", listRef.current);
  }, []);
  return (
    <div>
      画布：
      <canvas ref={canvasRef} />
      音频
      <audio ref={audioRef} />
      <button
        onClick={() => {
          countRef.current++;
          console.log(countRef.current);
        }}
      >
        {countRef.current} --- {time} +
      </button>
      <button onClick={() => setTime(time + 1)}>更新</button>
      {[0, 1, 2, 3, 4].map((item, index) => {
        return (
          <div
            key={item}
            ref={(node) => {
              listRef.current[index] = node;
            }}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
};
