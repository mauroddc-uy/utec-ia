export default [
  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        localStorage: "readonly"
      }
    },

    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "no-redeclare": "error"
    }
  }
];