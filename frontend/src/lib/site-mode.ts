const siteMode = (process.env.SITE_MODE || "full").trim().toLowerCase();

function enabled(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const SITE_MODE = siteMode;
export const IS_TEST_MODE = SITE_MODE === "test";
export const ENABLE_INTERACTIVE = !IS_TEST_MODE && enabled(process.env.ENABLE_INTERACTIVE, SITE_MODE === "full");
export const ENABLE_WRITE_API = !IS_TEST_MODE && enabled(process.env.ENABLE_WRITE_API, ENABLE_INTERACTIVE);
export const ENABLE_FORUM = enabled(process.env.ENABLE_FORUM, false);
