import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config is enough for this app (no ISR/queue/tag cache needed).
// See https://opennext.js.org/cloudflare for caching options if you add them later.
export default defineCloudflareConfig();
