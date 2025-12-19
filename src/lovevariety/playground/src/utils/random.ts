export function randomSelect<T>(array: readonly T[]) {
  if (array.length === 0) {
    throw new Error("Cannot select from an empty array");
  }
  return array[Math.floor(Math.random() * array.length)]!;
}

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}
