import type {
  ProductRevenue,
  RevenueRange,
  RevenueSort,
} from "../types/revenue";
export function vietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function validateRevenueRange(range: RevenueRange) {
  for (const value of [range.from, range.to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) === "0000")
      throw new Error("Vui lòng chọn ngày bắt đầu và ngày kết thúc hợp lệ.");
    const parsed = new Date(`${value}T00:00:00Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    )
      throw new Error("Ngày được chọn không tồn tại.");
  }
  if (range.from > range.to)
    throw new Error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
}
export function revenuePreset(
  preset: "today" | "week" | "month",
  now = new Date(),
): RevenueRange {
  const to = vietnamToday(now);
  if (preset === "today") return { from: to, to };
  if (preset === "month") return { from: `${to.slice(0, 7)}-01`, to };
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  return { from: start.toISOString().slice(0, 10), to };
}
export function revenueDate(value: string) {
  return value.split("-").reverse().join("/");
}
export function filterRevenue(
  items: ProductRevenue[],
  search: string,
  sort: RevenueSort,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLocaleLowerCase("vi");
  const needle = normalize(search.trim());
  return items
    .filter((item) => normalize(item.productName).includes(needle))
    .sort((a, b) => {
      const compare =
        sort === "revenue-desc"
          ? b.totalRevenue - a.totalRevenue
          : sort === "revenue-asc"
            ? a.totalRevenue - b.totalRevenue
            : sort === "profit-desc"
              ? b.profit - a.profit
              : sort === "profit-asc"
                ? a.profit - b.profit
                : sort === "quantity-desc"
                  ? b.totalQuantitySold - a.totalQuantitySold
                  : 0;
      return (
        compare ||
        a.productName.localeCompare(b.productName, "vi") ||
        a.productId.localeCompare(b.productId)
      );
    });
}
