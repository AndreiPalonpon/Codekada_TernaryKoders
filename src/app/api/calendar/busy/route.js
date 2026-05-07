import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getGoogleCalendarBusyBlocks } from "@/lib/google/calendar";

function defaultTimeRange() {
  const timeMin = new Date();
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + 7);

  return {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  };
}

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "UNAUTHORIZED", message: "Please sign in first." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const defaults = defaultTimeRange();
  const timeMin = searchParams.get("timeMin") || defaults.timeMin;
  const timeMax = searchParams.get("timeMax") || defaults.timeMax;

  try {
    const busy = await getGoogleCalendarBusyBlocks({
      email: session.user.email,
      timeMin,
      timeMax,
    });

    return NextResponse.json({
      success: true,
      data: { busy },
      error: null,
      meta: { timeMin, timeMax },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "GOOGLE_CALENDAR_FETCH_FAILED", message: error.message },
      },
      { status: 500 }
    );
  }
}
