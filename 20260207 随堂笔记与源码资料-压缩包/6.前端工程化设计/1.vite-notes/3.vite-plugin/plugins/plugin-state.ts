import { Plugin } from "vite";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const pluginState = (): Plugin => {
  return {
    name: "plugin-stats",

    generateBundle(options, bundle) {
      console.log("🚀 ~ pluginState ~ generateBundle");

      const stats = [];
      for (const fileName in bundle) {
        const { code, source, ...rest } = bundle[fileName];
        // console.log("🚀 ~ pluginState ~ rest:", rest);
        const { modules } = rest;
        let len = 0;
        for (const k in modules) {
          if (!Object.hasOwn(modules, k)) continue;

          const m = modules[k];
          len += m.renderedLength;
        }
        stats.push(`- **${fileName}**: ${len} bytes`);
      }

      const markdown = `# Build Stats\n\n${stats.join("\n")}\n`;
      writeFileSync(resolve(__dirname, "../dist/build-stats.md"), markdown);
    },
  };
};
