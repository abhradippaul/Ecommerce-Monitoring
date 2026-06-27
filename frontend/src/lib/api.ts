export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  // If response is 401 or 403, try to refresh the token
  if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("refresh_token");

    if (refreshToken) {
      try {
        const isGateway = window.location.port === "" || window.location.port === "80";
        const REFRESH_URL = isGateway 
          ? "/api/v1/auth/refresh" 
          : "http://localhost:3002/api/v1/auth/refresh";

        const refreshResponse = await fetch(REFRESH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          if (result.data?.access_token) {
            const newAccessToken = result.data.access_token;
            localStorage.setItem("access_token", newAccessToken);

            // Retry the original request with the new token
            const retryHeaders = new Headers(options.headers);
            retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
            return await fetch(url, { ...options, headers: retryHeaders });
          }
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }

    // If refresh fails or there's no refresh token, log out
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  return response;
}
