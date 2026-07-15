export function* chunkIterator<T>(items: T[], tamanho: number): Generator<T[], void, unknown> {
  if (tamanho <= 0) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i += tamanho) {
    yield items.slice(i, i + tamanho);
  }
}

export function splitTxtLine(line: string): string[] {
  return line.split(";");
}
