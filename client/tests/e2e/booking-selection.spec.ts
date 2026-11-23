import { expect, test, type Page } from "@playwright/test";

const stations = [
  { id: "650000000000000000000001", name: "Apex PC", code: "PC-01", type: "PC", description: "High performance gaming PC", specifications: {}, installedGames: ["Valorant"], hourlyRateMinor: 25000, currency: "INR", status: "active" },
  { id: "650000000000000000000002", name: "Orbit Console", code: "CON-01", type: "Console", description: "Console lounge station", specifications: {}, installedGames: ["FC"], hourlyRateMinor: 30000, currency: "INR", status: "active" },
];

async function mockApi(page: Page, options: { failSecondCreate?: boolean; failFirstPayment?: boolean; delayCreate?: boolean } = {}) {
  const calls = { availability: [] as string[], creates: [] as string[], payments: [] as string[] };
  await page.addInitScript(() => localStorage.setItem("nexusArenaToken", "browser-test-token"));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");
    const method = route.request().method();
    const respond = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ status: status < 400 ? "success" : "error", data, ...(status >= 400 ? { message: "Simulated station booking failure." } : {}) }) });
    if (path === "/auth/me") return respond({ user: { id: "user-1", name: "Arena Member", email: "member@nexus.test", role: "user", status: "active" } });
    if (path === "/wallet") return respond({ wallet: { id: "wallet-1", balanceMinor: 200000, currency: "INR", status: "active", updatedAt: new Date().toISOString() } });
    if (path === "/stations") return respond({ stations, pagination: { page: 1, limit: 20, total: 2, totalPages: 1 } });
    if (path === "/bookings/availability") {
      const stationId = url.searchParams.get("stationId") || "";
      calls.availability.push(stationId);
      const station = stations.find((item) => item.id === stationId)!;
      return respond({ stationId, startAt: url.searchParams.get("startAt"), endAt: url.searchParams.get("endAt"), durationMinutes: 120, hourlyRateMinor: station.hourlyRateMinor, estimatedTotalMinor: station.hourlyRateMinor * 2, currency: "INR", available: true, reason: null, message: "Station is available for this session." });
    }
    if (path === "/bookings" && method === "POST") {
      const body = route.request().postDataJSON() as { stationId: string };
      calls.creates.push(body.stationId);
      if (options.delayCreate) await new Promise((resolve) => setTimeout(resolve, 300));
      if (options.failSecondCreate && body.stationId === stations[1].id) return respond({ message: "Simulated station booking failure." }, 409);
      return respond({ booking: { id: `booking-${body.stationId.slice(-1)}`, stationId: body.stationId, status: "pending", paymentStatus: "unpaid", priceSnapshot: { hourlyRateMinor: 25000, subtotalMinor: 50000, discountMinor: 0, totalMinor: 50000 } } }, 201);
    }
    if (/^\/bookings\/[^/]+\/pay$/.test(path) && method === "POST") {
      calls.payments.push(path.split("/")[2]);
      if (options.failFirstPayment && calls.payments.length === 1) return respond({ message: "Simulated wallet payment failure." }, 409);
      return respond({ booking: { id: path.split("/")[2], status: "confirmed", paymentStatus: "paid" }, transaction: {}, wallet: {}, idempotent: false });
    }
    if (/^\/stations\/[^/]+$/.test(path) && method === "GET") {
      const station = stations.find((item) => item.id === path.split("/")[2]);
      return respond({ station });
    }
    return respond({}, 404);
  });
  return calls;
}

for (const width of [375, 768, 1024, 1440]) {
  test(`station layout and selection footer work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    await page.goto("/");
    const cards = page.locator("#station-list > div.grid");
    await expect(cards.locator("article")).toHaveCount(2);
    const columns = await cards.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(width < 768 ? 1 : 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator("aside.fixed").getByRole("button", { name: "Continue to Checkout", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
    await page.getByRole("button", { name: /Add Orbit Console to booking selection/ }).click();
    await expect(page.getByText("2 Stations Selected")).toBeVisible();
    await expect(page.locator("aside.fixed").getByRole("button", { name: "Continue to Checkout", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("review removes a station and footer disappears after clearing the selection", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
  await page.getByRole("button", { name: /Add Orbit Console to booking selection/ }).click();
  await page.locator("aside.fixed").getByText("Review").click();
  await page.locator("aside.fixed").getByRole("button", { name: "Remove Apex PC" }).click();
  await expect(page.getByText("1 Station Selected")).toBeVisible();
  await page.getByRole("button", { name: /Remove Orbit Console from booking selection/ }).click();
  await expect(page.locator("aside.fixed")).toHaveCount(0);
});

test("cart stays synchronized, removes stations, checks each station and completes checkout", async ({ page }) => {
  const calls = await mockApi(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
  await page.getByRole("button", { name: /Add Orbit Console to booking selection/ }).click();
  await expect(page.getByText("2 Stations Selected")).toBeVisible();
  await page.getByRole("button", { name: /Remove Apex PC from booking selection/ }).click();
  await expect(page.getByText("1 Station Selected")).toBeVisible();
  await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
  await page.reload();
  await expect(page.getByText("2 Stations Selected")).toBeVisible();
  await page.locator("aside.fixed").getByRole("button", { name: "Continue to Checkout", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Apex PC", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orbit Console", exact: true })).toBeVisible();
  await expect.poll(() => new Set(calls.availability).size).toBe(2);
  await page.getByRole("button", { name: "Reserve and pay" }).click();
  await expect(page.getByText(/2 station\(s\) confirmed and paid/)).toBeVisible();
  expect(calls.creates).toHaveLength(2);
  expect(calls.payments).toHaveLength(2);
  await expect(page.getByText("No stations remain in checkout.")).toBeVisible();
});

test("partial failure reports completed bookings and keeps unprocessed stations selected", async ({ page }) => {
  const calls = await mockApi(page, { failSecondCreate: true });
  await page.goto("/");
  await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
  await page.getByRole("button", { name: /Add Orbit Console to booking selection/ }).click();
  await page.locator("aside.fixed").getByRole("button", { name: "Continue to Checkout", exact: true }).click();
  await page.getByRole("button", { name: "Reserve and pay" }).click();
  await expect(page.getByRole("alert")).toContainText("1 station(s) were confirmed");
  expect(calls.creates).toHaveLength(2);
  expect(calls.payments).toHaveLength(1);
  await expect(page.getByRole("heading", { name: "Orbit Console" })).toBeVisible();
  await expect(page.getByText("No stations remain in checkout.")).toHaveCount(0);
});

test("repeat clicks cannot submit duplicate booking requests", async ({ page }) => {
  const calls = await mockApi(page, { delayCreate: true });
  await page.goto("/");
  await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
  await page.locator("aside.fixed").getByRole("button", { name: "Continue to Checkout", exact: true }).click();
  const submit = page.getByRole("button", { name: "Reserve and pay" });
  await submit.click();
  const submitting = page.getByRole("button", { name: "Securing sessions…" });
  await expect(submitting).toBeDisabled();
  await submitting.click({ force: true }).catch(() => {});
  await expect(page.getByText(/1 station\(s\) confirmed and paid/)).toBeVisible();
  expect(calls.creates).toHaveLength(1);
});

test("payment failure retains the saved booking and retry does not create a duplicate", async ({ page }) => {
  const calls = await mockApi(page, { failFirstPayment: true });
  await page.goto("/");
  await page.getByRole("button", { name: /Add Apex PC to booking selection/ }).click();
  await page.locator("aside.fixed").getByRole("button", { name: "Continue to Checkout", exact: true }).click();
  await page.getByRole("button", { name: "Reserve and pay" }).click();
  await expect(page.getByRole("button", { name: "Retry payment" })).toBeVisible();
  await page.getByRole("button", { name: "Retry payment" }).click();
  await expect(page.getByText("Saved booking payment completed. No duplicate booking was created.")).toBeVisible();
  expect(calls.creates).toHaveLength(1);
  expect(calls.payments).toHaveLength(2);
});

test("existing single-station booking route remains available", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/stations/${stations[0].id}/book`);
  await expect(page.getByRole("heading", { name: "Apex PC" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reserve and pay" })).toBeVisible();
});
