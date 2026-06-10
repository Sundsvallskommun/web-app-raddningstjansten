/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// Vite serves imported PDFs as a hashed URL string.
declare module "*.pdf" {
  const src: string;
  export default src;
}
