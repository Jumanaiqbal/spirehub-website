module.exports = {
  apps: [
    {
      name: "spire-hub-website",
      script: "server/prod-server.ts",
      interpreter: "node_modules/.bin/tsx",
      interpreter_args: "--env-file=.env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "300M",
    },
  ],
};
