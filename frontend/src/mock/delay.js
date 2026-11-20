export function delay(ms) {
  const duration = ms !== undefined ? ms : Math.floor(Math.random() * (500 - 250 + 1)) + 250;
  return new Promise((resolve) => setTimeout(resolve, duration));
}
