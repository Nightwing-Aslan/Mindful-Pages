// Helper function for UK time
function getUKDate() {
  const now = new Date();
  const isDST = now.getMonth() > 2 && now.getMonth() < 10; // Apr-Oct
  const ukOffset = isDST ? 60 : 0; // Minutes
  return new Date(now.getTime() + (ukOffset * 60 * 1000));
}

function getUKDateAsString() {
    // UK time (UTC+0/UTC+1 for DST)
    const now = new Date();
    const isDST = now.getMonth() > 2 && now.getMonth() < 10; // Apr-Oct
    const ukOffset = isDST ? 60 : 0; // Minutes
    return new Date(now.getTime() + (ukOffset * 60 * 1000))
        .toISOString()
        .split('T')[0];
}
