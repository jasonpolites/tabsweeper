// Globals
let pendingCloseEvents = 0;
let hwndCurrentId;
let rules;
const TYPE_URL = 0;
const TYPE_TITLE = 1;
const TYPE_DEFAULT = 2;

const closeDuplicateTabs = (callback) => {
  getDuplicateTabs(dupes => {
    let num = dupes?.length;
    pendingCloseEvents = num;
    if (num > 0) {
      for (let i = 0; i < dupes.length; i++) {
        chrome.tabs.remove(dupes[i].id, () => {
          if (--num === 0) {
            setBadgeValue(0);
            if (callback) {
              callback.call(this, dupes);
            }
          }
        });
      }
    } else {
      if (callback) {
        callback.call(this, dupes);
      }
    }
  });
}

const getDuplicateTabs = (callback) => {
  let self = this;

  // Get the current active tab in the lastly focused window
  chrome.tabs.query({
    // active: true,
    // lastFocusedWindow: true
  }, tabs => {
    let dupes = [];

    if (tabs) {
      let all = [];

      for (let i = 0; i < tabs.length; i++) {

        // Get for exclusions
        let type = TYPE_DEFAULT;
        let bFullUrl = false;
        for (let rule in rules) {
          if (tabs[i].url.match(rule) != null) {
            type = parseInt(rules[rule].detectType);
            bFullUrl = rules[rule].bUseFullUrl === true;
            break;
          }
        }

        if (type >= 0) {
          let id = getTabIdentifier(tabs[i], type, bFullUrl);
          if (!all[id]) {
            all[id] = tabs[i];
          } else {
            // Don't push this one if it's the current tab
            if(tabs[i].highlighted == true) {
            // if (tabs[i].id === currentTabId) {
              dupes.push(all[id]);
            } else {
              dupes.push(tabs[i]);
            }
          }
        }
      }

      all = null;  // Delete
    }

    if (callback) {
      callback.call(self, dupes);
    }
  });
}

const setBadgeValue = (val) => {
  if (val == undefined) {
    getDuplicateTabs((dupes) => {
      setBadgeText(dupes.length);
      let title;
      if (dupes.length > 0) {
        title = "Click to close these tabs:\n";
        for (let i = 0; i < dupes.length; i++) {
          title += "- " + dupes[i].title + "\n";
        }
      } else {
        title = "Close Duplicate Tabs";
      }
      chrome.action.setTitle({
        "title": title
      });
    });
  } else {
    setBadgeText(val);
  }
}

const setBadgeText = (val) => {
  if (val > 0) {
    chrome.action.setBadgeText({ text: '' + val });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({
      "title": "Close Duplicate Tabs"
    });
  }

  chrome.action.setBadgeBackgroundColor(
    {color: '#32CD32'},  // LimeGreen
    () => { /* ... */ },
  );
}

const getTabIdentifier = (tab, type, bFullUrl) => {

  if (type === TYPE_TITLE) {
    return tab.title;
  }

  let url = tab.url;

  if (bFullUrl !== true) {
    if (url && url.indexOf('#') >= 0) {
      url = url.substring(0, url.indexOf('#'));
    }

    if (url && url.indexOf('?') >= 0) {
      url = url.substring(0, url.indexOf('?'));
    }
  }

  if (type === TYPE_URL) {
    return url;
  } else {
    return url + "#" + tab.title;
  }
}

const loadOptions = (callback) => {
  let self = this;
  chrome.storage.sync.get('rules', (result) => {
    if (result) {
      rules = result.rules;
      // showWarning = result.showWarning;
    } else {
      rules = {};
    }
    if (callback) {
      callback.call(self, rules);
    }
  });
}

function main() {

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
    // if (tabId !== hWndOptionsTabId && changeInfo.status === 'complete') {
    if (changeInfo.status === 'complete') {
      setBadgeValue();
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, _changeInfo, _tab) => {
    // if (tabId !== hWndOptionsTabId) {
      if (pendingCloseEvents === 0) {
        setBadgeValue();
      } else {
        pendingCloseEvents--;
        if (pendingCloseEvents < 0) {
          pendingCloseEvents = 0;
        }
      }
    // }
  });

  chrome.action.onClicked.addListener(() => {
    closeDuplicateTabs();
  });

  //Add a listener to respond to changes in settings
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action) {
      if (message.action === 'update_exclusions') {
        loadOptions(() => {
          setBadgeValue();
          sendResponse();
        });
      }
    }
    return true;
  });

  // Get current window
  chrome.windows.getCurrent({ populate: false }, (wnd) => {
    hwndCurrentId = wnd.id;
    // Get Settings
    loadOptions(() => {
      setBadgeValue();
    });
  });
}

main();
