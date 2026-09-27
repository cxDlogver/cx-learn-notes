export type PageState<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty"; data: T }
  | { kind: "ready"; data: T };

export function pageState<T>(
  query: {
    isPending: boolean;
    isError: boolean;
    data?: T;
    error?: Error | null;
  },
  isEmpty: (data: T) => boolean,
): PageState<T> {
  if (query.isError)
    return { kind: "error", message: query.error?.message ?? "请求失败" };
  if (query.isPending || query.data === undefined) return { kind: "loading" };
  return isEmpty(query.data)
    ? { kind: "empty", data: query.data }
    : { kind: "ready", data: query.data };
}
