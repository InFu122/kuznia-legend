// Minimalne typy środowiska artefaktu claude.ai (gdy gra jest uruchomiona jako artefakt do testów).
/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

declare global {
  interface Window {
    claude?: {
      use?: (name: string) => Promise<any>;
      hot?: { snapshot?: (fn: () => unknown) => void; ready?: (fn: (data: any) => void) => void; data?: any };
    };
  }
}
