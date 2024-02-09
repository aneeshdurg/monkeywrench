class FirefoxShim {
  constructor() {
    this.browser = 'firefox';
  }
  getBrowser() {
    return this.browser;
  }

  async getFromStorage(key) {
    const args = {};
    args[key] = null;
    return browser.storage.local.get(args);
  }

  async setInStorage(key, value) {
    const args = {};
    args[key] = value;
    return browser.storage.local.set(args);
  }

  async evalInInspectedWindow(evalString) {
    return browser.devtools.inspectedWindow.eval(evalString);
  }

  async log() {
    console.log(...arguments);
  }
}

class ChromeShim {
  constructor() {
    this.browser = 'chrome';
  }
  getBrowser() {
    return this.browser;
  }

  async getFromStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result);
      });
    });
  }

  async setInStorage(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({key: value}, () => {
        resolve();
      });
    });
  }

  async evalInInspectedWindow(evalString) {
    return new Promise((resolve, reject) => {
      chrome.devtools.inspectedWindow.eval(evalString, (result) => {
        resolve(result);
      });
    });
  }

  async log() { }
}

const isChrome = typeof browser === 'undefined';
window.browserShim = isChrome ? new ChromeShim() : new FirefoxShim();
