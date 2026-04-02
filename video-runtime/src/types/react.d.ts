declare module "react" {
  namespace React {
    type ReactNode = unknown;
    type ReactElement = unknown;

    interface FC<P = {}> {
      (props: P): ReactNode;
    }

    type ComponentType<P = {}> = FC<P>;

    interface CSSProperties {
      [key: string]: string | number | undefined;
    }

    function createElement(type: unknown, props?: unknown, ...children: ReactNode[]): ReactNode;
  }

  export = React;
}

declare module "react/jsx-runtime" {
  export namespace JSX {
    type Element = unknown;
    interface IntrinsicElements {
      [key: string]: unknown;
    }
  }

  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare module "react/jsx-runtime.js" {
  export * from "react/jsx-runtime";
}
