// import { forwardRef, useEffect, useRef, type PropsWithChildren } from "react";

// type FancyButtonProps = PropsWithChildren;

// const FancyButton = forwardRef<HTMLButtonElement, FancyButtonProps>(
//   (props, ref) => (
//     <button ref={ref} className="fancy-button">
//       {props.children}
//     </button>
//   ),
// );

// export function ForwardRefDemo() {
//   const buttonRef = useRef(null);

//   useEffect(() => {
//     console.log(buttonRef.current); // 输出 <button> 元素
//   }, []);

//   return <FancyButton ref={buttonRef}>Click me</FancyButton>;
// }
import { useEffect, useRef, type PropsWithChildren, type Ref } from "react";

type FancyButtonProps = PropsWithChildren & {
  ref?: Ref<HTMLButtonElement>;
};

const FancyButton = (props: FancyButtonProps) => {
  const { children, ref } = props;
  return (
    <button ref={ref} className="fancy-button">
      {children}
    </button>
  );
};

export function ForwardRefDemo() {
  const buttonRef = useRef(null);

  useEffect(() => {
    console.log(buttonRef.current); // 输出 <button> 元素
  }, []);

  return <FancyButton ref={buttonRef}>Click me</FancyButton>;
}
