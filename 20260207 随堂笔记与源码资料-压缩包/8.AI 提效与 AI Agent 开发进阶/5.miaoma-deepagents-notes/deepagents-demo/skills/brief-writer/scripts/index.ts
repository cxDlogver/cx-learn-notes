export function buildBriefSkeleton(moduleName: string) {
  return {
    moduleName,
    sections: ["目标", "核心概念", "Demo 指向", "练习", "风险点"],
    tone: "面向有经验开发者，简洁、具体、可执行",
  };
}
