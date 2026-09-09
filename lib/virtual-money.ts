export function formatVirtualMoney(value: number) {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US")}`;
}
