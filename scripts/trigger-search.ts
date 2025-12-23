/**
 * usage: npx tsx scripts/trigger-search.ts
 */
async function triggerSearch() {
  const endpoint = "https://5c82b7156f5c.ngrok-free.app/api/ondc/search";

  console.log(`[Trigger] Hitting endpoint: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // Body is constructed internally by the route
    });

    const data = await response.json();
    console.log("[Trigger] Status:", response.status);
    console.log("[Trigger] Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("[Trigger] Failed to connect. Is the server running?");
    console.error(error);
  }
}

triggerSearch();
