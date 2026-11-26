/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GA4 measurement id (STS-050). Optional; invalid or absent means analytics stays off. */
  readonly VITE_GA4_ID?: string;
}
