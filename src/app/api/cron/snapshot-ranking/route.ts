import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { saveRankingSnapshot } from "@/lib/ranking-snapshots";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await saveRankingSnapshot();

  revalidatePath("/ranking");
  revalidatePath("/dashboard");

  return NextResponse.json(snapshot);
}
