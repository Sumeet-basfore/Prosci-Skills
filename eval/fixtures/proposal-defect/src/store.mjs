export function writeRecords(records) {
  return { written: records.length, backup: "data/records.backup.json" };
}
