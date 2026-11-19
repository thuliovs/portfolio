"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  createSessionToken,
  isAuthConfigured,
  secureCompare,
} from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isAuthConfigured()) {
    return {
      error:
        "Access is not configured. Add the required environment variables.",
    };
  }

  const submittedPassword = formData.get("password");

  if (
    typeof submittedPassword !== "string" ||
    submittedPassword.length === 0 ||
    submittedPassword.length > 256
  ) {
    return { error: "Enter the access password." };
  }

  const validPassword = await secureCompare(
    submittedPassword,
    process.env.PORTFOLIO_PASSWORD ?? "",
  );

  if (!validPassword) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "That password is not valid." };
  }

  const token = await createSessionToken();

  if (!token) {
    return { error: "Access could not be configured." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
    priority: "high",
  });

  redirect("/");
}
