import { useEffect } from "react";
import { useLocation } from "react-router";
import { BACKEND_BASE_URL } from "../../services/api/client";

const API_URL = BACKEND_BASE_URL ? `${BACKEND_BASE_URL}/api` : "/api";
const SESSION_KEY = "visitor_session_id";

const getSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

const postAnalytics = async (path: string, params: URLSearchParams) => {
  try {
    await fetch(`${API_URL}${path}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Analytics should never block the public web.
  }
};

export function VisitorAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const sessionId = getSessionId();
    const params = new URLSearchParams({
      page: `${location.pathname}${location.search || ""}`,
      sessionId,
    });

    const timerId = window.setTimeout(() => {
      void postAnalytics("/analytics/pageview", params);
      void postAnalytics("/analytics/heartbeat", new URLSearchParams({ sessionId }));
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const sessionId = getSessionId();
    const pulse = () => {
      if (document.visibilityState === "visible") {
        void postAnalytics("/analytics/heartbeat", new URLSearchParams({ sessionId }));
      }
    };

    pulse();
    const interval = window.setInterval(pulse, 60000);
    window.addEventListener("focus", pulse);
    document.addEventListener("visibilitychange", pulse);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", pulse);
      document.removeEventListener("visibilitychange", pulse);
    };
  }, []);

  return null;
}
