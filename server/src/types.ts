import { Database } from "sql.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    userDb?: Database;
    userDbPath?: string;
  }
}

export {};
