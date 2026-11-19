"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form className="login-form" action={action}>
      <div className="field-group">
        <label htmlFor="password">Access password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          maxLength={256}
          aria-describedby={state.error ? "login-error" : "password-hint"}
        />
        <span id="password-hint">Shared privately for portfolio review.</span>
      </div>

      {state.error ? (
        <p className="login-error" id="login-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button className="login-button" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Enter portfolio"}
      </button>
    </form>
  );
}
