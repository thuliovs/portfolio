import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Private preview",
  description: "Private portfolio preview.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function LoginPage() {
  return (
    <main id="main-content" className="login-main">
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10m-10 0h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="eyebrow">Private preview</p>
        <h1 id="login-heading">Work in progress.</h1>
        <p className="login-intro">
          This portfolio is currently under review. Enter the access password
          to continue.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
