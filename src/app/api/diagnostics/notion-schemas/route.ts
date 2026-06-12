import { NextResponse } from "next/server";
import {
  getNotionFeedbackEnv,
  getNotionIngredientsEnv,
  getNotionMealsEnv
} from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import { getPlannerSchemaDiagnostics } from "@/src/lib/notion/meal-plan";
import {
  getDatabaseTitle,
  getPrimaryDataSourceId,
  getPropertyType,
  isRecord
} from "@/src/lib/notion/route-helpers";
import {
  evaluateFeedbackSchemaHealth,
  evaluateIngredientsSchemaHealth,
  evaluateIntakeSchemaHealth,
  evaluateMealsSchemaHealth,
  type MealSchemaHealth
} from "@/src/lib/notion/schema-health";
import { guardApiRequest } from "@/src/lib/server/request-guards";

export const runtime = "nodejs";

type DatabaseKey = "meals" | "ingredients" | "feedback" | "planner" | "intake";

interface SchemaSummary {
  key: DatabaseKey;
  id: string;
  dataSourceId?: string;
  title: string;
  properties: Array<{
    name: string;
    type: string;
    relationTarget?: {
      databaseId: string | null;
      dataSourceId: string | null;
    };
  }>;
  health?: MealSchemaHealth;
  plannerHealth?: {
    ok: boolean;
    warnings: string[];
  };
}

interface SchemaFailure {
  key: DatabaseKey;
  ok: false;
  error: string;
}

function getProperties(database: unknown) {
  if (!isRecord(database) || !isRecord(database.properties)) {
    return [];
  }

  return Object.entries(database.properties)
    .map(([name, property]) => {
      const type = getPropertyType(property) ?? "unknown";
      const relationTarget =
        type === "relation" && isRecord(property) && isRecord(property.relation)
          ? {
              databaseId:
                typeof property.relation.database_id === "string"
                  ? property.relation.database_id
                  : null,
              dataSourceId:
                typeof property.relation.data_source_id === "string"
                  ? property.relation.data_source_id
                  : null
            }
          : undefined;

      return {
        name,
        type,
        ...(relationTarget ? { relationTarget } : {})
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getSafeSchemaError(key: DatabaseKey) {
  return `Unable to read ${key} database schema. Check the database ID and integration sharing.`;
}

async function readSchema(
  key: DatabaseKey,
  getEnv: () => { NOTION_API_KEY: string } & Record<string, string>,
  databaseIdKey:
    | "NOTION_MEALS_DATABASE_ID"
    | "NOTION_INGREDIENTS_DATABASE_ID"
    | "NOTION_FEEDBACK_DATABASE_ID"
): Promise<SchemaSummary | SchemaFailure> {
  try {
    const env = getEnv();
    const notion = getNotionClient(env.NOTION_API_KEY);
    const database = await notion.databases.retrieve({
      database_id: env[databaseIdKey]
    });
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: getPrimaryDataSourceId(database)
    });

    return {
      key,
      id: database.id,
      dataSourceId: getPrimaryDataSourceId(database),
      title: getDatabaseTitle(database),
      properties: getProperties(dataSource)
    };
  } catch (error) {
    console.error(`Notion ${key} schema diagnostics failure`, error);

    return {
      key,
      ok: false,
      error: getSafeSchemaError(key)
    };
  }
}

async function readIntakeSchema(): Promise<SchemaSummary | SchemaFailure> {
  try {
    const NOTION_API_KEY = process.env.NOTION_API_KEY?.trim();
    const intakeId = process.env.NOTION_MEAL_INTAKE_DATABASE_ID?.trim();

    if (!NOTION_API_KEY || !intakeId) {
      return {
        key: "intake",
        ok: false,
        error:
          "Meal Intake is not configured. Add NOTION_MEAL_INTAKE_DATABASE_ID only if iOS Shortcut storage should persist shared meals."
      };
    }

    const notion = getNotionClient(NOTION_API_KEY);

    try {
      const dataSource = await notion.dataSources.retrieve({
        data_source_id: intakeId
      });

      return {
        key: "intake",
        id: intakeId,
        dataSourceId: intakeId,
        title: "Meal Intake",
        properties: getProperties(dataSource)
      };
    } catch {
      const database = await notion.databases.retrieve({
        database_id: intakeId
      });
      const dataSourceId = getPrimaryDataSourceId(database);
      const dataSource = await notion.dataSources.retrieve({
        data_source_id: dataSourceId
      });

      return {
        key: "intake",
        id: database.id,
        dataSourceId,
        title: getDatabaseTitle(database),
        properties: getProperties(dataSource)
      };
    }
  } catch (error) {
    console.error("Notion intake schema diagnostics failure", error);

    return {
      key: "intake",
      ok: false,
      error:
        "Unable to read intake database schema. Check the database/data source ID and integration sharing."
    };
  }
}

export async function GET(request: Request) {
  const guardResponse = guardApiRequest(request, {
    rateLimitKey: "diagnostics",
    rateLimit: 10
  });

  if (guardResponse) {
    return guardResponse;
  }

  const results = await Promise.all([
    readSchema("meals", getNotionMealsEnv, "NOTION_MEALS_DATABASE_ID"),
    readSchema(
      "ingredients",
      getNotionIngredientsEnv,
      "NOTION_INGREDIENTS_DATABASE_ID"
    ),
    readSchema("feedback", getNotionFeedbackEnv, "NOTION_FEEDBACK_DATABASE_ID"),
    getPlannerSchemaDiagnostics(),
    readIntakeSchema()
  ]);

  const summaries = results.filter(
    (result): result is SchemaSummary => !("ok" in result)
  );
  const meals = summaries.find((database) => database.key === "meals");
  const mealsTarget =
    meals?.dataSourceId
      ? {
          databaseId: meals.id,
          dataSourceId: meals.dataSourceId
        }
      : null;
  const databases = summaries.map((database) => {
    if (database.key === "meals") {
      return {
        ...database,
        health: evaluateMealsSchemaHealth(database.properties)
      };
    }

    if (database.key === "feedback" && mealsTarget) {
      return {
        ...database,
        health: evaluateFeedbackSchemaHealth(database.properties, mealsTarget)
      };
    }

    if (database.key === "ingredients" && mealsTarget) {
      return {
        ...database,
        health: evaluateIngredientsSchemaHealth(database.properties, mealsTarget)
      };
    }

    if (database.key === "intake") {
      return {
        ...database,
        health: evaluateIntakeSchemaHealth(database.properties)
      };
    }

    if (database.key === "planner" && "health" in database) {
      return {
        ...database,
        plannerHealth: database.health
      };
    }

    return database;
  });
  const errors = results.filter(
    (result): result is SchemaFailure => "ok" in result && !result.ok
  );

  return NextResponse.json({
    ok: errors.length === 0,
    databases,
    errors
  });
}
