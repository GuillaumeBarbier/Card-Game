import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Entre Nous — Le jeu de cartes des couples",
    short_name: "Entre Nous",
    description:
      "365 dilemmes à trancher à deux. Un compte à rebours, deux verdicts, zéro échappatoire.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a0c",
    theme_color: "#0b0a0c",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
