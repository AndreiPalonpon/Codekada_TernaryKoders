import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password using the same PBKDF2 configuration
    const hash = crypto.pbkdf2Sync(password, "syncforge-salt", 1000, 64, "sha512").toString("hex");

    // Create the user with default preferences matching the design specification
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hash,
      auth_provider_id: "credentials",
      preferences: {
        preferred_window: "Morning",
        deep_work_max_minutes: 240,
        buffer_minutes: 15,
      },
    });

    return NextResponse.json(
      { message: "User registered successfully", userId: newUser._id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
