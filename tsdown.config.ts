import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "src/changeset-jira.ts",
  format: "esm",
  platform: "node",
  outDir: "dist",
  dts: true
});
