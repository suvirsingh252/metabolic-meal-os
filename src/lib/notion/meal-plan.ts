import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  getCurrentPlannerWeek,
  isMealSlot,
  isPlannerSource,
  isPlannerStatus,
  type MealSlot,
  type PlannerMutationInput,
  type PlannerSetupIssue,
  type PlannerSlot,
  type PlannerViewModel
} from "@/src/lib/domain/planner";
import {
  getOptionalNotionMealPlanEnv,
  type NotionMealPlanEnv
} from "@/src/lib/env";
import { getNotionClient } from "@/src/lib/notion/client";
import type { MealSummary } from "@/src/lib/notion/meal-summary";
import { queryAllMealSummaries } from "@/src/lib/notion/meals-query";
import { getPrimaryDataSourceId, isRecord } from "@/src/lib/notion/route-helpers";

const requiredPlannerProperties = [
  { name: "Name", type: "title" },
  { name: "Plan Date", type: "date" },
  { name: "Meal Slot", type: "select" },
  { name: "Meal", type: "relation" },
  { name: "Status", type: "select" },
  { name: "Source", type: "select" },
  { name: "Household Notes", type: "rich_text" }
] as const;

type NotionClient = ReturnType<typeof getNotionClient>;
type NotionProperty = PageObjectResponse["properties"][string];

interface PlannerSchema {
  ok: boolean;
  dataSourceId: string | null;
  issues: PlannerSetupIssue[];
}

const MEAL_PLAN_DATA_SOURCE_ERROR =
  "Meal Plan database did not return a queryable data source.";

function getProperties(source: unknown) {
  if (isRecord(source) && isRecord(source.properties)) {
    return source.properties;
  }

  return {};
}

function getPropertyType(property: unknown) {
  return isRecord(property) && typeof property.type === "string"
    ? property.type
    : null;
}

function readDate(property: NotionProperty | undefined) {
  return property?.type === "date" ? property.date?.start ?? null : null;
}

function readSelect(property: NotionProperty | undefined) {
  return property?.type === "select" ? property.select?.name ?? null : null;
}

function readRichText(property: NotionProperty | undefined) {
  if (property?.type !== "rich_text") {
    return null;
  }

  const value = property.rich_text
    .map((part) => part.plain_text)
    .join("")
    .trim();

  return value || null;
}

function readRelationId(property: NotionProperty | undefined) {
  if (property?.type !== "relation") {
    return null;
  }

  return property.relation[0]?.id ?? null;
}

function title(content: string) {
  return {
    title: [
      {
        text: {
          content
        }
      }
    ]
  };
}

function date(start: string) {
  return {
    date: {
      start
    }
  };
}

function select(name: string) {
  return {
    select: {
      name
    }
  };
}

function richText(content: string) {
  return {
    rich_text: content
      ? [
          {
            text: {
              content
            }
          }
        ]
      : []
  };
}

function relation(pageId: string | null) {
  return {
    relation: pageId ? [{ id: pageId }] : []
  };
}

async function getPlannerDataSourceId(
  notion: NotionClient,
  env: NotionMealPlanEnv
) {
  if (env.NOTION_MEAL_PLAN_SOURCE_ID) {
    return env.NOTION_MEAL_PLAN_SOURCE_ID;
  }

  if (!env.NOTION_MEAL_PLAN_DATABASE_ID) {
    throw new Error("Meal Plan data source is not configured.");
  }

  const database = await notion.databases.retrieve({
    database_id: env.NOTION_MEAL_PLAN_DATABASE_ID
  });

  return getPrimaryDataSourceId(database, MEAL_PLAN_DATA_SOURCE_ERROR);
}

async function readPlannerSchema(
  notion: NotionClient,
  env: NotionMealPlanEnv
) {
  const dataSourceId = await getPlannerDataSourceId(notion, env);
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: dataSourceId
  });
  const properties = getProperties(dataSource);
  const issues = requiredPlannerProperties.flatMap((expected) => {
    const actualType = getPropertyType(properties[expected.name]);

    if (!actualType) {
      return [
        {
          code: "schema" as const,
          message: `Meal Plan property "${expected.name}" is missing.`
        }
      ];
    }

    if (actualType !== expected.type) {
      return [
        {
          code: "schema" as const,
          message: `Meal Plan property "${expected.name}" must be ${expected.type}, found ${actualType}.`
        }
      ];
    }

    return [];
  });

  return {
    ok: issues.length === 0,
    dataSourceId,
    issues
  } satisfies PlannerSchema;
}

function missingPlannerConfig(): PlannerViewModel {
  const days = getCurrentPlannerWeek();

  return {
    weekStart: days[0].date,
    weekEnd: days[6].date,
    days,
    slots: [],
    setup: {
      ok: false,
      issues: [
        {
          code: "missing-config",
          message:
            "Weekly Planner needs NOTION_MEAL_PLAN_SOURCE_ID or NOTION_MEAL_PLAN_DATABASE_ID before plans can be loaded or saved."
        }
      ]
    }
  };
}

function mapPlanPageToSlot(
  page: unknown,
  mealById: Map<string, MealSummary>
): PlannerSlot | null {
  if (!isRecord(page) || !isRecord(page.properties) || typeof page.id !== "string") {
    return null;
  }

  const properties = page.properties as PageObjectResponse["properties"];
  const planDate = readDate(properties["Plan Date"]);
  const slot = readSelect(properties["Meal Slot"]);
  const status = readSelect(properties.Status);
  const source = readSelect(properties.Source);

  if (!planDate || !isMealSlot(slot) || !isPlannerStatus(status)) {
    return null;
  }

  const mealId = readRelationId(properties.Meal);
  const meal = mealId ? mealById.get(mealId) ?? null : null;

  return {
    id: page.id,
    planDate,
    mealSlot: slot,
    status,
    source: isPlannerSource(source) ? source : null,
    meal: meal
      ? {
          id: meal.id,
          name: meal.mealName,
          url: meal.url
        }
      : mealId
        ? {
            id: mealId,
            name: "Saved meal",
            url: ""
          }
        : null,
    householdNotes: readRichText(properties["Household Notes"])
  };
}

export async function getWeeklyDinnerPlanner(): Promise<PlannerViewModel> {
  const days = getCurrentPlannerWeek();
  const env = getOptionalNotionMealPlanEnv();

  if (!env) {
    return missingPlannerConfig();
  }

  const notion = getNotionClient(env.NOTION_API_KEY);
  const schema = await readPlannerSchema(notion, env);

  if (!schema.ok || !schema.dataSourceId) {
    return {
      weekStart: days[0].date,
      weekEnd: days[6].date,
      days,
      slots: [],
      setup: {
        ok: false,
        issues: schema.issues
      }
    };
  }

  const [plans, mealsResult] = await Promise.all([
    notion.dataSources.query({
      data_source_id: schema.dataSourceId,
      page_size: 100,
      filter: {
        and: [
          {
            property: "Plan Date",
            date: {
              on_or_after: days[0].date
            }
          },
          {
            property: "Plan Date",
            date: {
              on_or_before: days[6].date
            }
          }
        ]
      },
      sorts: [
        {
          property: "Plan Date",
          direction: "ascending"
        }
      ]
    }),
    queryAllMealSummaries()
  ]);
  const mealById = new Map(mealsResult.meals.map((meal) => [meal.id, meal]));

  return {
    weekStart: days[0].date,
    weekEnd: days[6].date,
    days,
    slots: plans.results
      .map((page) => mapPlanPageToSlot(page, mealById))
      .filter((slot): slot is PlannerSlot => slot !== null),
    setup: {
      ok: true,
      issues: []
    }
  };
}

async function findPlannerSlot(
  notion: NotionClient,
  dataSourceId: string,
  planDate: string,
  slot: MealSlot
) {
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: 1,
    filter: {
      and: [
        {
          property: "Plan Date",
          date: {
            equals: planDate
          }
        },
        {
          property: "Meal Slot",
          select: {
            equals: slot
          }
        }
      ]
    }
  });

  return response.results[0]?.id ?? null;
}

export async function writePlannerMutation(input: PlannerMutationInput) {
  const env = getOptionalNotionMealPlanEnv();

  if (!env) {
    throw new Error("Weekly Planner Notion config is missing.");
  }

  const notion = getNotionClient(env.NOTION_API_KEY);
  const schema = await readPlannerSchema(notion, env);

  if (!schema.ok || !schema.dataSourceId) {
    throw new Error("Weekly Planner Notion schema is incomplete.");
  }

  const existingPageId = await findPlannerSlot(
    notion,
    schema.dataSourceId,
    input.planDate,
    input.slot
  );
  const baseProperties = {
    Name: title(`${input.slot} ${input.planDate}`),
    "Plan Date": date(input.planDate),
    "Meal Slot": select(input.slot)
  };

  if (input.action === "assign") {
    const properties = {
      ...baseProperties,
      Meal: relation(input.mealId ?? null),
      Status: select("Planned"),
      Source: select("Manual")
    };

    if (existingPageId) {
      await notion.pages.update({
        page_id: existingPageId,
        properties
      });
      return { id: existingPageId };
    }

    const page = await notion.pages.create({
      parent: {
        data_source_id: schema.dataSourceId,
        type: "data_source_id"
      },
      properties: {
        ...properties,
        "Household Notes": richText("")
      }
    });

    return { id: page.id };
  }

  if (!existingPageId) {
    throw new Error("No planned meal exists for that date and slot.");
  }

  if (input.action === "clear") {
    await notion.pages.update({
      page_id: existingPageId,
      properties: {
        Meal: relation(null),
        Status: select("Planned"),
        Source: select("Manual")
      }
    });
  }

  if (input.action === "status") {
    await notion.pages.update({
      page_id: existingPageId,
      properties: {
        Status: select(input.status ?? "Planned")
      }
    });
  }

  return { id: existingPageId };
}

export async function getPlannerSchemaDiagnostics() {
  const env = getOptionalNotionMealPlanEnv();

  if (!env) {
    return {
      key: "planner" as const,
      ok: false,
      error:
        "Meal Plan is not configured. Add NOTION_MEAL_PLAN_SOURCE_ID in Vercel."
    };
  }

  const notion = getNotionClient(env.NOTION_API_KEY);
  const schema = await readPlannerSchema(notion, env);

  return {
    key: "planner" as const,
    id:
      env.NOTION_MEAL_PLAN_SOURCE_ID ??
      env.NOTION_MEAL_PLAN_DATABASE_ID ??
      "unknown",
    title: "Meal Plan",
    properties: requiredPlannerProperties.map((property) => ({
      name: property.name,
      type: property.type
    })),
    health: {
      ok: schema.ok,
      warnings: schema.issues.map((issue) => issue.message)
    }
  };
}
