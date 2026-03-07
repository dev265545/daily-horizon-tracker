import { useState, useCallback } from "react";
import { login as doLogin, logout as doLogout, isLoggedIn } from "@/lib/auth";

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [error, setError] = useState("");

  const login = useCallback(async (password: string) => {
    setError("");
    const ok = await doLogin(password);
    if (ok) {
      setLoggedIn(true);
    } else {
      setError("Incorrect password.");
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setLoggedIn(false);
  }, []);

  const checkSession = useCallback(() => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      return false;
    }
    return true;
  }, []);

  return { loggedIn, error, login, logout, checkSession };
}
