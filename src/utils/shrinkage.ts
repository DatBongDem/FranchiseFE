import type {
  ShrinkageFilter,
  ShrinkageItem,
  ShrinkageSort,
} from "../types/shrinkage";
import { validateRevenueRange } from "./revenue";
export function expiryDay(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value))
    throw new Error("Ngày hết hạn trả về không hợp lệ.");
  // SQL CAST(Expiry AS date) is a calendar date; do not shift it through local timezones.
  const day = value.slice(0, 10);
  validateRevenueRange({ from: day, to: day });
  return day;
}
export function validateShrinkageFilter(filter: ShrinkageFilter) {
  if (filter.from) validateRevenueRange({ from: filter.from, to: filter.from });
  if (filter.to) validateRevenueRange({ from: filter.to, to: filter.to });
  if (filter.from && filter.to && filter.from > filter.to)
    throw new Error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
}
export function filterShrinkage(
  items: ShrinkageItem[],
  filter: ShrinkageFilter,
  sort: ShrinkageSort,
) {
  validateShrinkageFilter(filter);
  const text = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLocaleLowerCase("vi");
  return items
    .filter(
      (item) =>
        text(item.productName).includes(text(filter.search.trim())) &&
        (!filter.from || item.expiredDate >= filter.from) &&
        (!filter.to || item.expiredDate <= filter.to),
    )
    .sort((a, b) => {
      const primary =
        sort === "date-asc"
          ? a.expiredDate.localeCompare(b.expiredDate)
          : sort === "date-desc"
            ? b.expiredDate.localeCompare(a.expiredDate)
            : sort === "loss-desc"
              ? b.lossAmount - a.lossAmount
              : sort === "quantity-desc"
                ? b.expiredQuantity - a.expiredQuantity
                : 0;
      return (
        primary ||
        a.productName.localeCompare(b.productName, "vi") ||
        a.productId.localeCompare(b.productId) ||
        a.expiredDate.localeCompare(b.expiredDate)
      );
    });
}
export function shrinkageTotals(items: ShrinkageItem[]) {
  return {
    quantity: items.reduce((sum, item) => sum + item.expiredQuantity, 0),
    loss: items.reduce((sum, item) => sum + item.lossAmount, 0),
    products: new Set(items.map((item) => item.productId.toLowerCase())).size,
  };
}
export function topShrinkageProducts(items: ShrinkageItem[]) {
  const products = new Map<
    string,
    { id: string; name: string; loss: number }
  >();
  for (const item of items) {
    const id = item.productId.toLowerCase();
    const product = products.get(id) || { id, name: item.productName, loss: 0 };
    product.loss += item.lossAmount;
    products.set(id, product);
  }
  return [...products.values()]
    .filter((item) => item.loss > 0)
    .sort(
      (a, b) =>
        b.loss - a.loss ||
        a.name.localeCompare(b.name, "vi") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
}
