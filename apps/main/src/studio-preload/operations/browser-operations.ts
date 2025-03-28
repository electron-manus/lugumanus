export function setupBrowserOperations() {
  return {
    getWindowHeight() {
      return window.innerHeight;
    },

    getWindowWidth() {
      return window.innerWidth;
    },

    back() {
      window.history.back();
    },

    getCurrentUrl() {
      return window.location.href;
    },
  };
}
