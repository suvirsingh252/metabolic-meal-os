export interface ServerEnv {
  OPENAI_API_KEY: string;
  NOTION_API_KEY: string;
  NOTION_MEALS_DATABASE_ID: string;
  NOTION_INGREDIENTS_DATABASE_ID: string;
  NOTION_FEEDBACK_DATABASE_ID: string;
  NOTION_WEEKLY_PLANS_DATABASE_ID: string;
  NOTION_MEAL_TEMPLATES_DATABASE_ID: string;
}

export type OpenAIEnv = Pick<ServerEnv, "OPENAI_API_KEY">;
export type NotionMealsEnv = Pick<
  ServerEnv,
  "NOTION_API_KEY" | "NOTION_MEALS_DATABASE_ID"
>;
export type NotionFeedbackEnv = Pick<
  ServerEnv,
  "NOTION_API_KEY" | "NOTION_FEEDBACK_DATABASE_ID"
>;
export type FullNotionEnv = Pick<
  ServerEnv,
  | "NOTION_API_KEY"
  | "NOTION_MEALS_DATABASE_ID"
  | "NOTION_INGREDIENTS_DATABASE_ID"
  | "NOTION_FEEDBACK_DATABASE_ID"
  | "NOTION_WEEKLY_PLANS_DATABASE_ID"
  | "NOTION_MEAL_TEMPLATES_DATABASE_ID"
>;

const requiredServerEnvKeys = [
  "OPENAI_API_KEY",
  "NOTION_API_KEY",
  "NOTION_MEALS_DATABASE_ID",
  "NOTION_INGREDIENTS_DATABASE_ID",
  "NOTION_FEEDBACK_DATABASE_ID",
  "NOTION_WEEKLY_PLANS_DATABASE_ID",
  "NOTION_MEAL_TEMPLATES_DATABASE_ID"
] as const satisfies readonly (keyof ServerEnv)[];

const openAIEnvKeys = ["OPENAI_API_KEY"] as const satisfies readonly (keyof OpenAIEnv)[];

const notionMealsEnvKeys = [
  "NOTION_API_KEY",
  "NOTION_MEALS_DATABASE_ID"
] as const satisfies readonly (keyof NotionMealsEnv)[];

const notionFeedbackEnvKeys = [
  "NOTION_API_KEY",
  "NOTION_FEEDBACK_DATABASE_ID"
] as const satisfies readonly (keyof NotionFeedbackEnv)[];

const fullNotionEnvKeys = [
  "NOTION_API_KEY",
  "NOTION_MEALS_DATABASE_ID",
  "NOTION_INGREDIENTS_DATABASE_ID",
  "NOTION_FEEDBACK_DATABASE_ID",
  "NOTION_WEEKLY_PLANS_DATABASE_ID",
  "NOTION_MEAL_TEMPLATES_DATABASE_ID"
] as const satisfies readonly (keyof FullNotionEnv)[];

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

function readServerEnv<TEnv extends Partial<ServerEnv>>(
  keys: readonly (keyof TEnv & keyof ServerEnv)[]
): TEnv {
  assertServerOnly();

  return keys.reduce<TEnv>((env, key) => {
    env[key] = readRequiredServerEnv(key);
    return env;
  }, {} as TEnv);
}

export function getOpenAIEnv(): OpenAIEnv {
  return readServerEnv<OpenAIEnv>(openAIEnvKeys);
}

export function getNotionMealsEnv(): NotionMealsEnv {
  return readServerEnv<NotionMealsEnv>(notionMealsEnvKeys);
}

export function getNotionFeedbackEnv(): NotionFeedbackEnv {
  return readServerEnv<NotionFeedbackEnv>(notionFeedbackEnvKeys);
}

export function getFullNotionEnv(): FullNotionEnv {
  return readServerEnv<FullNotionEnv>(fullNotionEnvKeys);
}

export function getFullServerEnv(): ServerEnv {
  return readServerEnv<ServerEnv>(requiredServerEnvKeys);
}

export function getServerEnv(): ServerEnv {
  return getFullServerEnv();
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
