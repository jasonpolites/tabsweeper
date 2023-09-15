/**
 * pendingCloseEvents records how many tabs are to be closed.
 * Purely for performance reasons, we want to defer updating the badge
 * until all tabs have been closed. Because tab closing is async (in Manifest 2)
 * we need to track a counter as tab closing is not guaranteed to be ordered
 */
let pendingCloseEvents = 0;

/**
 * The custom rules defined in the options. This is a basic (serializable) map/object
 */
let rules;

const TYPE_URL = 0;
const TYPE_TITLE = 1;
const TYPE_DEFAULT = 2;



/**
 * Closes any duplicate tabs
 * @param {Function} callback The function to call once all tabs were closed
 * @deprecated Prefer closeDuplicateTabsSync
 */
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

/**
 * Closes any duplicate tabs
 * @returns The duplicate tabs that were closed
 */
const closeDuplicateTabsSync = async () => {
  let dupes = await getDuplicateTabsSync();
  let num = dupes?.length;
  pendingCloseEvents = num;
  if (num > 0) {
    for (let i = 0; i < dupes.length; i++) {
      await chrome.tabs.remove(dupes[i].id);
      if (--num === 0) {
        setBadgeValue(0);
      } 
    }
  } 
  return dupes;
}

/**
 * Finds any duplicate tabs
 * @param {Function} callback The function to call with the duplicate tabs
 * @deprecated Prefer getDuplicateTabsSync
 */
const getDuplicateTabs = (callback) => {
  let self = this;
  chrome.tabs.query({}, tabs => {
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

      all = null; // Delete
    }

    if (callback) {
      callback.call(self, dupes);
    }
  });
}

const getDuplicateTabsSync = async () => {
  let tabs = await chrome.tabs.query({});
  let dupes = [];

  if (tabs) {
    let all = [];
    for (let i = 0; i < tabs.length; i++) {
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
    all = null; // Delete
  }

  return dupes;
}

const setBadgeValue = async (val) => {
  if (val == undefined) {
    let dupes = await getDuplicateTabsSync();
    // getDuplicateTabs((dupes) => {
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
    // });
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
    () => {}
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

/**
 * Loads the options set by the user
 * @param {Function} callback The function to callback with the loaded options.
 * @deprecated Prefer loadOptionsSync
 */
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

/**
 * Loads the options set by the user
 * @returns The loaded options map containing the custom rules for url patterns.
 */
const loadOptionsSync = async () => {
  let result = await chrome.storage.sync.get('rules');
  if (result) {
    rules = result.rules;
  } else {
    rules = {};
  }
  return rules;
}

const main = async () => {

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
    if (changeInfo.status === 'complete') {
      (async () => {
        await setBadgeValue();
      })();
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, _changeInfo, _tab) => {
    if (pendingCloseEvents === 0) {
      (async () => {
        await setBadgeValue();
      })();
    } else {
      pendingCloseEvents--;
      if (pendingCloseEvents < 0) {
        pendingCloseEvents = 0;
      }
    }
  });

  chrome.action.onClicked.addListener(() => {
    (async () => {
      await closeDuplicateTabsSync();
    })();
  });

  // Add a listener to respond to changes in settings as these changes may
  // affect how many duplicates we think we have
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action) {
      if (message.action === 'update_exclusions') {

        (async () => {
          await loadOptionsSync();
          await setBadgeValue();
          sendResponse();
        })();

        // loadOptions(() => {
        //   setBadgeValue();
        //   sendResponse();
        // });
      }
    }
    return true;
  });

  await loadOptionsSync();
  await setBadgeValue();

  // loadOptions(() => {
  //   setBadgeValue();
  // });
}

(async () => {
  await main();
})();


