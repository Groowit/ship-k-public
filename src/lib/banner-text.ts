export function getBalancedBannerTextLines(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");

  if (normalized.length < 56) {
    return [normalized];
  }

  const midpoint = Math.floor(normalized.length / 2);
  const splitIndex = findNearestWordBoundary(normalized, midpoint);

  if (splitIndex < 20 || normalized.length - splitIndex < 20) {
    return [normalized];
  }

  return [normalized.slice(0, splitIndex).trim(), normalized.slice(splitIndex + 1).trim()];
}

function findNearestWordBoundary(text: string, midpoint: number) {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const match of text.matchAll(/\s/g)) {
    const index = match.index ?? -1;
    const distance = Math.abs(index - midpoint);

    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  }

  return bestIndex;
}
