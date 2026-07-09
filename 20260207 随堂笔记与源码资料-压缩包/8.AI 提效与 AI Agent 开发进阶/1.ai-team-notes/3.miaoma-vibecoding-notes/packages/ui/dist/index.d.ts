import * as react from 'react';
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, HTMLAttributes } from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}
declare const Button: react.ForwardRefExoticComponent<ButtonProps & react.RefAttributes<HTMLButtonElement>>;

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
    label?: ReactNode;
    error?: ReactNode;
    helperText?: ReactNode;
}
declare const Input: react.ForwardRefExoticComponent<InputProps & react.RefAttributes<HTMLInputElement>>;

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    title?: ReactNode;
    extra?: ReactNode;
    children: ReactNode;
}
declare function Card({ title, extra, children, className, ...rest }: CardProps): react_jsx_runtime.JSX.Element;

interface ModalProps {
    open: boolean;
    title?: ReactNode;
    onOpenChange: (open: boolean) => void;
    footer?: ReactNode;
    children: ReactNode;
}
declare function Modal({ open, title, onOpenChange, footer, children }: ModalProps): react.ReactPortal | null;

export { Button, type ButtonProps, type ButtonSize, type ButtonVariant, Card, type CardProps, Input, type InputProps, Modal, type ModalProps };
