module.exports = {
  root: true,
  extends: ["../../packages/config/eslint-preset.cjs"],
  env: { node: true, jest: true },
  parserOptions: { sourceType: "module" },
  ignorePatterns: ["dist", "node_modules"],
};
