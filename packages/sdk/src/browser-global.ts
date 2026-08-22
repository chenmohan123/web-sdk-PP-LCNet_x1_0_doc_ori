import * as api from "./index";

const root = globalThis as typeof globalThis & {
  PPDocOrientation?: typeof api;
};
root.PPDocOrientation = api;
export default api;
