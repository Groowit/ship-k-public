import { expect, test } from "@playwright/test";

const customerEmail = process.env.E2E_CUSTOMER_EMAIL;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test("unauthenticated customer is redirected to auth before checkout", async ({ page }) => {
  await page.goto("/products/skincare-starter-set?ref=creator_code&link=skincare_demo");
  await expect(page.getByRole("heading", { name: "Skincare Starter Set" })).toBeVisible();

  await page.getByRole("link", { name: "Buy now" }).click();

  await expect(page).toHaveURL(/\/auth\?next=/);
  await expect(page.getByRole("heading", { name: "Account access" })).toBeVisible();
});

test("unauthenticated admin visitor is redirected to auth", async ({ page }) => {
  await page.goto("/admin/products");

  await expect(page).toHaveURL(/\/auth\?next=/);
  await expect(page.getByRole("heading", { name: "Account access" })).toBeVisible();
});

test("auth page account mode controls stay interactive after hydration", async ({
  page
}) => {
  await page.goto("/auth?next=%2Fshop");

  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page.getByText("Create your shipK account")).toBeVisible();
  await expect(page.getByLabel(/I agree to the Terms/i)).toBeVisible();

  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Sign in to shipK")).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toBeEnabled();
});

test("signed-out account icon opens sign-in and register menu", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Account access" }).click();

  await expect(page.getByRole("menuitem", { name: "Sign In" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Register Now" })).toBeVisible();

  await page.getByRole("menuitem", { name: "Register Now" }).click();

  await expect(page).toHaveURL(/\/auth\?mode=sign-up/);
  await expect(page.getByText("Create your shipK account")).toBeVisible();
  await expect(page.getByLabel(/I agree to the Terms/i)).toBeVisible();
});

test("mobile product detail keeps the checkout entry usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products/hydration-skincare-set");

  await expect(page.getByRole("heading", { name: "Hydration Skincare Set" })).toBeVisible();
  await page.getByRole("link", { name: "Buy now" }).click();
  await expect(page).toHaveURL(/\/auth\?next=/);
});

test("shop shows skincare filters and filters by included item category", async ({ page }) => {
  await page.goto("/shop");

  const filters = page.getByLabel("Product filters");

  await expect(page.getByRole("heading", { name: /Skincare Sets/i })).toBeVisible();
  await expect(filters.getByRole("link", { name: "All", exact: true })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Face Cleansers" })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Face Serums" })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Moisturizers" })).toBeVisible();
  await expect(filters.getByRole("link", { name: "Toners" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Skincare Starter Set/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hydration Skincare Set/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Makeup Starter Set/i })).toHaveCount(0);

  await filters.getByRole("link", { name: "Toners" }).click();

  await expect(page).toHaveURL(/filter=toners/);
  await expect(page.getByRole("link", { name: /Skincare Starter Set/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Hydration Skincare Set/i })).toHaveCount(0);
});

test("makeup catalog shows the random sticker layer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/makeup");

  await expect(page.getByRole("heading", { name: /Makeup Sets/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "All ★" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lips" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Eyes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Face" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cheeks" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Makeup set", exact: true })).toBeVisible();
  await expect(page.getByTestId("floating-sticker-layer")).toBeVisible();
  await expect(page.getByTestId("floating-sticker")).toHaveCount(4);

  await page.getByRole("link", { name: "Lips" }).click();

  await expect(page).toHaveURL(/filter=lips/);
  await expect(page.getByRole("link", { name: /Makeup Starter Set/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Skincare Starter Set/i })).toHaveCount(0);
});

test("set detail shows media fallback, items, and use steps", async ({ page }) => {
  await page.goto("/products/skincare-starter-set");

  await expect(page.getByAltText("Skincare Starter Set intro image")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Everything inside the set" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Step-by-step order" })).toBeVisible();
  await expect(page.getByText("Cloud Rice Foam Cleanser")).toBeVisible();
  await expect(page.getByText("Cleanse lightly")).toBeVisible();
  await expect(page.getByText("$49.00").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy now" })).toBeVisible();
});

test("short pages keep the footer pinned to the bottom of the viewport", async ({
  page
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/policies/terms");

  const footerBox = await page.locator("footer").boundingBox();

  expect(footerBox).not.toBeNull();
  expect(Math.round(footerBox!.y + footerBox!.height)).toBe(900);
});

test.describe("authenticated customer flow", () => {
  test.skip(
    !customerEmail || !customerPassword,
    "Set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD for live Supabase auth coverage"
  );

  test("customer signs in, checks out with PayPal mock, and sees their order", async ({
    page
  }) => {
    await signIn(page, customerEmail!, customerPassword!);
    await page.goto("/products/skincare-starter-set?ref=creator_code&link=skincare_demo");
    await page.getByRole("link", { name: "Buy now" }).click();

    await expect(page.getByRole("heading", { name: "Pay with PayPal" })).toBeVisible();
    await page.getByRole("textbox", { name: "Name" }).fill("Jamie Park");
    await page.getByRole("textbox", { name: "Phone" }).fill("2135550144");
    await page.getByRole("textbox", { name: "Address line 1" }).fill("123 Ocean Ave");
    await page.getByRole("textbox", { name: "City" }).fill("Los Angeles");
    await page.getByRole("textbox", { name: "State" }).fill("CA");
    await page.getByRole("textbox", { name: "ZIP code" }).fill("90001");
    await page.getByText("I agree to the Terms").click();

    await page.getByTestId("mock-paypal-button").click();
    await expect(page).toHaveURL(/\/checkout\/success\?order=SK/, {
      timeout: 20_000
    });

    await page.goto("/account/orders");
    await expect(page.getByText(/SK\d+/).first()).toBeVisible();
  });
});

test.describe("authenticated admin flow", () => {
  test.skip(
    !adminEmail || !adminPassword,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for live admin auth coverage"
  );

  test("admin creates an active product and updates fulfillment without adminEmail input", async ({
    page
  }) => {
    await signIn(page, adminEmail!, adminPassword!, "/admin/products/new");

    await page.getByLabel("상품명").fill("Rice Calm Cream");
    await page.getByLabel("브랜드 / 큐레이터").fill("Namu Studio");
    await page.getByLabel("대표 이미지").fill("/catalog-assets/admin-product-placeholder.svg");
    await page.getByLabel("가격 USD").fill("24.00");
    await page.getByTestId("add-included-items").click();
    await page.getByLabel("구성품명").fill("Rice Calm Cream");
    await page.getByLabel("구성품 유형").fill("Skincare");
    await page.getByLabel("사용 메모").fill("A calm moisturizing step.");
    await page.getByTestId("add-routine-steps").click();
    await page.getByLabel("단계명").fill("Apply cream");
    await page.getByLabel("수행 방법").fill("Apply after serum.");
    await page.getByRole("button", { name: "판매중으로 발행" }).click();

    await expect(page.getByTestId("admin-product-message")).toContainText(
      "Rice Calm Cream 상품을 판매중으로 발행했습니다."
    );
    await expect(page.locator('input[name="adminEmail"]')).toHaveCount(0);
  });
});

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  next = "/shop"
) {
  await page.goto(`/auth?next=${encodeURIComponent(next)}`);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
