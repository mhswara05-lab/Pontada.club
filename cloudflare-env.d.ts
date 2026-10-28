declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PONTADA_MANAGER_PIN?: string;
    PONTADA_TOURNAMENT_KEY?: string;
  }
}
