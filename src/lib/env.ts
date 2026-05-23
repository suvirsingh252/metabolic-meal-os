export interface ServerEnv {
  OPENAI_API_KEY: string;
  NOTION_API_KEY: string;
  NOTION_MEALS_DATABASE_ID: string;
  NOTION_INGREDIENTS_DATABASE_ID: string;
  NOTION_FEEDBACK_DATABASE_ID: string;
  NOTION_WEEKLY_PLANS_DATABASE_ID: string;
  NOTION_MEAL_TEMPLATES_DATABASE_ID: string;
}

const requiredServerEnvKeys = [
  "OPENAI_API_KEY",
  "NOTION_API_KEY",
  "NOTION_MEALS_DATABASE_ID",
  "NOTION_INGREDIENTS_DATABASE_ID",
  "NOTION_FEEDBACK_DATABASE_ID",
  "NOTION_WEEKLY_PLANS_DATABASE_ID",
  "NOTION_MEAL_TEMPLATES_DATABASE_ID"
] as const satisfies readonly (keyof ServerEnv)[];

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("Server environment variables can only be read on the server.");
  }
}

function readRequiredServerEnv(key: keyof ServerEnv): string {
  assertServerOnly();

  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(
      `Missing required server environment variable: ${key}. Add it to .env.local.`
    );
  }

  return value;
}

export function getServerEnv(): ServerEnv {
  assertServerOnly();

  return requiredServerEnvKeys.reduce<ServerEnv>((env, key) => {
    env[key] = readRequiredServerEnv(key);
    return env;
  }, {} as ServerEnv);
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, property: string | symbol) {
    if (typeof property !== "string") {
      return undefined;
    }

    if (!requiredServerEnvKeys.includes(property as keyof ServerEnv)) {
      return undefined;
    }

    return readRequiredServerEnv(property as keyof ServerEnv);
  }
});
