import { defineConfig } from "vite";

export default defineConfig({
  // Expose the dev server on the local network so it can be opened on a phone
  server: {
    host: true,
  },
  build: {
    rolldownOptions: {
      input: {
        index: "index.html",
        "a-propos": "a-propos.html",
        services: "services.html",
        conseils: "conseils.html",
        contact: "contact.html",
      },
    },
  },
});
