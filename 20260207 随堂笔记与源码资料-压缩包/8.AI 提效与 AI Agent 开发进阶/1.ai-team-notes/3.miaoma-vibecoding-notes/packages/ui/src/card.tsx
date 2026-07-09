import { type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}

export function Card({ title, extra, children, className, ...rest }: CardProps) {
  return (
    <section className={cx("dui-card", className)} {...rest}>
      {title || extra ? (
        <header className="dui-card__header">
          {title ? <h3 className="dui-card__title">{title}</h3> : null}
          {extra ? <div className="dui-card__extra">{extra}</div> : null}
        </header>
      ) : null}
      <div className="dui-card__body">{children}</div>
    </section>
  );
}
