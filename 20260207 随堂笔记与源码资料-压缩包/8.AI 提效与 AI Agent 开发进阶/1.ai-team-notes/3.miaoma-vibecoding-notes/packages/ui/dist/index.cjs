"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Button: () => Button,
  Card: () => Card,
  Input: () => Input,
  Modal: () => Modal
});
module.exports = __toCommonJS(index_exports);

// src/button.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var Button = (0, import_react.forwardRef)(function Button2({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...rest
}, ref) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      ref,
      type,
      disabled: disabled || loading,
      "data-loading": loading ? "true" : void 0,
      ...rest,
      children: [
        loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dui-button__spinner", "aria-hidden": "true" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children })
      ]
    }
  );
});

// src/input.tsx
var import_react2 = require("react");

// src/utils.ts
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// src/input.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var Input = (0, import_react2.forwardRef)(function Input2({ label, error, helperText, className, id, ...rest }, ref) {
  const generatedId = (0, import_react2.useId)();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : void 0;
  const errorId = error ? `${inputId}-error` : void 0;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "dui-field", htmlFor: inputId, children: [
    label ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dui-field__label", children: label }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "input",
      {
        ref,
        id: inputId,
        className: cx("dui-input", error ? "dui-input--error" : false, className),
        "aria-invalid": error ? true : void 0,
        "aria-describedby": describedBy,
        ...rest
      }
    ),
    error ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dui-field__message dui-field__message--error", id: errorId, children: error }) : helperText ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dui-field__message", id: helperId, children: helperText }) : null
  ] });
});

// src/card.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function Card({ title, extra, children, className, ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: cx("dui-card", className), ...rest, children: [
    title || extra ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "dui-card__header", children: [
      title ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: "dui-card__title", children: title }) : null,
      extra ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dui-card__extra", children: extra }) : null
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dui-card__body", children })
  ] });
}

// src/modal.tsx
var import_react3 = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime4 = require("react/jsx-runtime");
function Modal({ open, title, onOpenChange, footer, children }) {
  (0, import_react3.useEffect)(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);
  if (!open || typeof document === "undefined") {
    return null;
  }
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dui-modal", role: "presentation", onMouseDown: () => onOpenChange(false), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "section",
      {
        className: "dui-modal__panel",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": title ? "dui-modal-title" : void 0,
        onMouseDown: (event) => event.stopPropagation(),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "dui-modal__header", children: [
            title ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "dui-modal__title", id: "dui-modal-title", children: title }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { variant: "ghost", size: "sm", "aria-label": "\u5173\u95ED\u5F39\u7A97", onClick: () => onOpenChange(false), children: "\u5173\u95ED" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dui-modal__body", children }),
          footer ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("footer", { className: "dui-modal__footer", children: footer }) : null
        ]
      }
    ) }),
    document.body
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Button,
  Card,
  Input,
  Modal
});
//# sourceMappingURL=index.cjs.map