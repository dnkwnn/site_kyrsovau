import * as api from "./api";
export default {
  async fetch(request: Request, env: {ASSETS: Fetcher}) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      const handler = (api as any)[request.method];
      return handler ? handler(request) : Response.json({error:"Метод не поддерживается"},{status:405});
    }
    return env.ASSETS.fetch(request);
  }
};
