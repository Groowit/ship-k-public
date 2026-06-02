export function isRemoteImagePath(value: string) {
  return /^https?:\/\//i.test(value);
}

export function getImageOptimizationProps(value: string) {
  return isRemoteImagePath(value) ? { unoptimized: true } : {};
}
