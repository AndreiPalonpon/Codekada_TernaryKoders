import { google } from "googleapis";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

async function ensureFreshGoogleCredentials(user) {
  const integration = user.integrations?.google_calendar;

  if (!integration?.access_token) {
    throw new Error("Google Calendar is not connected for this user.");
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.token_expiry?.getTime?.(),
  });

  const isExpired = integration.token_expiry
    ? integration.token_expiry.getTime() <= Date.now() + 60_000
    : false;

  if (isExpired && integration.refresh_token) {
    const { credentials } = await oauth2Client.refreshAccessToken();

    oauth2Client.setCredentials({
      ...oauth2Client.credentials,
      ...credentials,
    });

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "integrations.google_calendar.access_token": credentials.access_token,
          "integrations.google_calendar.token_expiry": credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : integration.token_expiry,
        },
      }
    );
  }

  return oauth2Client;
}

export async function getGoogleCalendarBusyBlocks({ email, timeMin, timeMax }) {
  await dbConnect();

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User profile was not found.");
  }

  const auth = await ensureFreshGoogleCredentials(user);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: "primary" }],
    },
  });

  return response.data.calendars?.primary?.busy || [];
}

export async function getGoogleCalendarEvents({ email, timeMin, timeMax }) {
  await dbConnect();

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User profile was not found.");
  }

  const auth = await ensureFreshGoogleCredentials(user);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return (response.data.items || [])
    .filter((event) => event.status !== "cancelled")
    .map((event) => ({
      id: event.id,
      title: event.summary || "(No title)",
      description: event.description || "",
      htmlLink: event.htmlLink || "",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
    }))
    .filter((event) => event.start && event.end);
}

export async function createGoogleCalendarEvent({ email, event }) {
  await dbConnect();

  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User profile was not found.");
  }

  const auth = await ensureFreshGoogleCredentials(user);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start,
      },
      end: {
        dateTime: event.end,
      },
    },
  });

  const createdEvent = response.data;

  return {
    id: createdEvent.id,
    title: createdEvent.summary || event.title,
    description: createdEvent.description || "",
    htmlLink: createdEvent.htmlLink || "",
    start: createdEvent.start?.dateTime || createdEvent.start?.date,
    end: createdEvent.end?.dateTime || createdEvent.end?.date,
  };
}
