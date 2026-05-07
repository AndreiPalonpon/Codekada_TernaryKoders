import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createGoogleCalendarEvent, getGoogleCalendarEvents } from "@/lib/google/calendar";

const CreateCalendarEventSchema = z.object({
  title: z.string().trim().min(1, "Event title is required."),
  description: z.string().optional().default(""),
  start: z.string().datetime("Event start must be an ISO datetime."),
  end: z.string().datetime("Event end must be an ISO datetime."),
}).refine((event) => new Date(event.end) > new Date(event.start), {
  message: "Event end must be after event start.",
  path: ["end"],
});

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
    const events = await getGoogleCalendarEvents({
      email: session.user.email,
      timeMin,
      timeMax,
    });

    return NextResponse.json({
      success: true,
      data: { events },
      error: null,
      meta: { timeMin, timeMax },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "GOOGLE_CALENDAR_EVENTS_FETCH_FAILED", message: error.message },
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "UNAUTHORIZED", message: "Please sign in first." } },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: { code: "INVALID_JSON", message: "Request body is not valid JSON." } },
      { status: 400 }
    );
  }

  const parseResult = CreateCalendarEventSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: parseResult.error.issues[0].message,
        },
      },
      { status: 400 }
    );
  }

  try {
    const event = await createGoogleCalendarEvent({
      email: session.user.email,
      event: parseResult.data,
    });

    return NextResponse.json({
      success: true,
      data: { event },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "GOOGLE_CALENDAR_EVENT_CREATE_FAILED",
          message: error.message,
        },
      },
      { status: 500 }
    );
  }
}
