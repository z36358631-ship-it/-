const ROUTES = Object.freeze({
  ricochet: "/games/ricochet-crew/",
  nightmarket: "/games/monster-night-market/",
  squad: "/games/three-lane-squad/",
});

const FORBIDDEN_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "localhost",
  "127.0.0.1",
  "::1",
]);

function isConfiguredHttpsOrigin(baseUrl) {
  if (typeof baseUrl !== "string" || !baseUrl) return false;
  const match = /^https:\/\/([^/:?#]+)(?::\d+)?\/?$/u.exec(baseUrl);
  if (!match) return false;
  const hostname = match[1].toLowerCase();
  return (
    !FORBIDDEN_HOSTS.has(hostname) &&
    ![".invalid", ".test", ".example"].some((suffix) =>
      hostname.endsWith(suffix)
    )
  );
}

function resolveGameUrl(baseUrl, key) {
  if (!isConfiguredHttpsOrigin(baseUrl)) return null;
  const route = ROUTES[key] || ROUTES.ricochet;
  return `${baseUrl.replace(/\/+$/u, "")}${route}`;
}

module.exports = {
  ROUTES,
  isConfiguredHttpsOrigin,
  resolveGameUrl,
};
