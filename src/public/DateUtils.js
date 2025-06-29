export function getUKDate() {
  const now = new Date();
  const isDST = now.getMonth() > 2 && now.getMonth() < 10; // Apr-Oct
  const ukOffset = isDST ? 60 : 0; // Minutes
  return new Date(now.getTime() + (ukOffset * 60 * 1000));
}

export function getUKDateAsString() {
    const ukNow = new Date(
        new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })
    );
    return ukNow.toISOString().split("T")[0]; // e.g. "2025-06-29"
}