/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TLC_MODE?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_TEAM_PRESENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
