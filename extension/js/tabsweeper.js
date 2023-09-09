// Globals
var hWndOptionsOpen = false;
var hWndOptionsId;
var hWndOptionsTabId;
var pendingCloseEvents = 0;
var hwndCurrentId;
var rules;
var showWarning = false;
var TYPE_URL = 0;
var TYPE_TITLE = 1;
var TYPE_DEFAULT = 2;

function closeDuplicateTabs(callback) {
  getDuplicateTabs(dupes => {
    var num = dupes?.length;
    pendingCloseEvents = num;
    if (num > 0) {
      for (var i = 0; i < dupes.length; i++) {
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

function getDuplicateTabs(callback) {
  var self = this;

  // Get the current active tab in the lastly focused window
  chrome.tabs.query({
    // active: true,
    // lastFocusedWindow: true
  }, tabs => {
    var dupes = [];

    if (tabs) {
      var all = [];

      for (var i = 0; i < tabs.length; i++) {

        // Get for exclusions
        var type = TYPE_DEFAULT;
        var bFullUrl = false;
        for (var rule in rules) {
          if (tabs[i].url.match(rule) != null) {
            type = parseInt(rules[rule].type);
            bFullUrl = rules[rule].full === true;
            break;
          }
        }

        if (type >= 0) {
          var id = getTabIdentifier(tabs[i], type, bFullUrl);
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



  // chrome.tabs.getSelected(null, tab => {
  //   var currentTabId = tab.id;

  //   chrome.tabs.query({

  //   }, (tabs) => {

  //       var dupes = [];

  //       if (tabs) {
  //         var all = [];

  //         for (var i = 0; i < tabs.length; i++) {

  //           // Get for exclusions
  //           var type = TYPE_DEFAULT;
  //           var bFullUrl = false;
  //           for (var rule in rules) {
  //             if (tabs[i].url.match(rule) != null) {
  //               type = parseInt(rules[rule].type);
  //               bFullUrl = rules[rule].full === true;
  //               break;
  //             }
  //           }

  //           if (type >= 0) {
  //             var id = getTabIdentifier(tabs[i], type, bFullUrl);
  //             if (!all[id]) {
  //               all[id] = tabs[i];
  //             } else {
  //               // Don't push this one if it's the current tab
  //               if (tabs[i].id === currentTabId) {
  //                 dupes.push(all[id]);
  //               } else {
  //                 dupes.push(tabs[i]);
  //               }
  //             }
  //           }
  //         }

  //         all = null;  // Delete
  //       }

  //       if (callback) {
  //         callback.call(self, dupes);
  //       }
  //     });    
  // });
}

function setBadgeValue(val) {
  if (val == undefined) {
    getDuplicateTabs((dupes) => {
      __setBadgeText(dupes.length);
      var title;
      if (dupes.length > 0) {
        title = "Click to close these tabs:\n";
        for (var i = 0; i < dupes.length; i++) {
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
    __setBadgeText(val);
  }
}

function __setBadgeText(val) {
  if (val > 0) {
    chrome.action.setBadgeText({ text: '' + val });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({
      "title": "Close Duplicate Tabs"
    });
  }
}

function getTabIdentifier(tab, type, bFullUrl) {

  if (type === TYPE_TITLE) {
    return tab.title;
  }

  var url = tab.url;

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

function launchSettingsModal() {
  if (hWndOptionsOpen === true) {
    chrome.windows.update(hWndOptionsId, { focused: true })
  } else {
    var w = 700;
    var h = 500;
    var l = (screen.width / 2) - (w / 2);
    var t = (screen.height / 2) - (h / 2);
    chrome.windows.create({
      url: chrome.runtime.getURL('settings.html'),
      type: 'popup',
      width: w,
      height: h,
      left: l,
      top: t,
      focused: true
    }, function (child) {
      hWndOptionsId = child.id;
      hWndOptionsTabId = child.tabs[0].id;
      hWndOptionsOpen = true;
    });

    chrome.windows.onRemoved.addListener((windowId) => {
      if (windowId == hWndOptionsId) {
        hWndOptionsOpen = false;
      }
    });
  }
}

function loadSettings(callback) {
  var self = this;
  chrome.storage.sync.get('rules', (result) => {
    if (result) {
      rules = result.rules;
      showWarning = result.showWarning;
    } else {
      rules = {};
    }
    if (callback) {
      callback.call(self, rules);
    }
  });
}

// Add addional setup functions here
var setupFunctions = {
  "1.1.1": [setup1_1_1]
};

function setup() {
  chrome.storage.sync.get('setup', function (result) {
    var version = chrome.runtime.getManifest().version;
    if (!result || result !== version) {
      var funcs = setupFunctions[version];
      if (funcs && funcs.length) {
        for (var i = 0; i < funcs.length; i++) {
          funcs[i](version);
        }
      }
      chrome.storage.sync.set({ 'setup': version });
    }
  });
}

// Additional setup for 1.1.1
function setup1_1_1(_version) {
  chrome.storage.sync.get('rules', (data) => {
    if (!data || Object.keys(data).length <= 0) {
      // Defaults
      var newRules = {
        "https://plx.corp.google.com/script/": {
          "type": "-1",
          "full": false
        },
        "https://www.google.com": {
          "type": "1",
          "full": false
        },
      };
      chrome.storage.sync.set({ 'rules': newRules });
    }
  });
}

function main() {

  setup();

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
    if (tabId !== hWndOptionsTabId && changeInfo.status === 'complete') {
      setBadgeValue();
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, _changeInfo, _tab) => {
    if (tabId !== hWndOptionsTabId) {
      if (pendingCloseEvents === 0) {
        setBadgeValue();
      } else {
        pendingCloseEvents--;
        if (pendingCloseEvents < 0) {
          pendingCloseEvents = 0;
        }
      }
    }
  });

  chrome.action.onClicked.addListener(() => {
    closeDuplicateTabs();
  });

  // try {
  //   chrome.contextMenus.create({
  //     id: 'show-settings', // or any other name
  //     title: 'Tab Sweeper Settings',
  //     contexts: ['browser_action'],
  //     visible:true
  //   }, () => {
  //     if (chrome.runtime.lastError) {
  //       // This will occasionally fail due to a duplicate ID, but there is no "exists" method
  //       // in the API to avoid this
  //       console.warn(chrome.runtime.lastError.message);
  //     }
  //   });
  // } catch (ignore) {} // Catch exception due to https://code.google.com/p/chromium/issues/detail?id=496020

  // chrome.contextMenus.onClicked.addListener(() => {
  //   launchSettingsModal();
  // });

  //Add a listener to respond to changes in settings
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action) {
      if (message.action === 'update_exclusions') {
        loadSettings(() => {
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
    loadSettings(() => {
      setBadgeValue();
    });
  });
}

main();
