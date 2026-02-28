export function setLocationHash(hash: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hash },
    writable: true,
    configurable: true,
  });
}

export function spyOnReplaceState() {
  return vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
}
