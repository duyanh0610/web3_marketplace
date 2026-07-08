module.exports = {
  root: true,
  extends: ["../../packages/config/eslint-preset.cjs"],
  env: { node: true },
  ignorePatterns: ["dist", "cache", "artifacts", "typechain-types"],
};
