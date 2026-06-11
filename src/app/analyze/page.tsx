import { AnalyzeClient } from "@/src/app/analyze/analyze-client";
import { fetchIntakeRecord } from "@/src/lib/intake/notion";

interface Props {
  searchParams: Promise<{ intake?: string }>;
}

export default async function AnalyzePage({ searchParams }: Props) {
  const params = await Promise.resolve(searchParams);
  const intakeId = typeof params?.intake === "string" ? params.intake.trim() : undefined;

  const intakeRecord = intakeId ? await fetchIntakeRecord(intakeId) : null;

  return <AnalyzeClient intakeRecord={intakeRecord} />;
}
