import { defineConfig } from "vite";

export default defineConfig({
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
