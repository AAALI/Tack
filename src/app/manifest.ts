import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tack — The board your team actually owns",
    short_name: "Tack",
    description:
      "Open-source Kanban. Self-host it free, or start on Tack Cloud — unlimited projects and members.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F5F2",
    theme_color: "#F6F5F2",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
