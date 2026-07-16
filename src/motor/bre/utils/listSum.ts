export function listSumNullable(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((acc, v) => acc + v, 0);
}

export function listSumIgnoreNull(values: (number | null | undefined)[]): number {
  const sum = listSumNullable(values);
  return sum ?? 0;
}
