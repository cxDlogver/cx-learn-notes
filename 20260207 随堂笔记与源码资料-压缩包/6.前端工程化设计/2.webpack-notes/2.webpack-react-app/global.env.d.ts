// 声明 css 全局定义
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
