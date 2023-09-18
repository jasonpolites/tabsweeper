/**
 * pendingCloseEvents records how many tabs are to be closed.
 * Purely for performance reasons, we want to defer updating the badge
 * until all tabs have been closed. Because tab closing is async (in Manifest 2)
 * we need to track a counter as tab closing is not guaranteed to be ordered
 */
let pendingCloseEvents = 0;


const options = {
  rules: undefined,
  bShowWarning: false
};

/**
 * The custom rules defined in the options. This is a basic (serializable) map/object
 * @deprecated
 */
let rules;

const TYPE_URL = 0;
const TYPE_TITLE = 1;
const TYPE_DEFAULT = 2;

/**
 * Closes any duplicate tabs
 * @returns The duplicate tabs that were closed
 */
const closeDuplicateTabsSync = async () => {
  let dupes = await getDuplicateTabsSync();
  let num = dupes?.length;
  pendingCloseEvents = num;
  if (num > 0) {
    if(options.bShowWarning === true) {
      // Render the list of dupes in a popup
      console.log(dupes);
    } else {
      await closeTabsSync(dupes);
    }
  } 
  return dupes;
}

const closeTabsSync = async (tabs) => {
  let num = tabs?.length;
  for (let i = 0; i < tabs.length; i++) {
    await chrome.tabs.remove(tabs[i].id);
    if (--num === 0) {
      await setBadgeValue(0);
    } 
  }
}


/**
 * Finds any duplicate tabs
 * @returns An array of duplicate tab IDs, or an empty array (never null)
 */
const getDuplicateTabsSync = async () => {
  let tabs = await chrome.tabs.query({});
  let dupes = [];

  if (tabs) {
    let all = [];
    for (let i = 0; i < tabs.length; i++) {
      let type = TYPE_DEFAULT;
      let bFullUrl = false;
      for (let rule in options.rules) {
        if (tabs[i].url.match(rule) != null) {
          type = parseInt(options.rules[rule].detectType);
          bFullUrl = options.rules[rule].bUseFullUrl === true;
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
    return url + "#" + tab .title;
  }
}

/**
 * Loads the rules set by the user
 * @returns The loaded rules map containing the custom rules for url patterns.
 */
const loadOptionsSync = async () => {
  let optionsData = await chrome.storage.sync.get();
  if (optionsData) {
    options.rules = optionsData.rules || {};
    options.bShowWarning = (optionsData.bShowWarning === true);
  } else {
    options.rules = {};
  }
  return options;
}

/*****************************************************************************
 * PATCHES
 *****************************************************************************/

/**
 * Patches v0.0.3 to update the clear the stored data structure
 * @param The index of this patch, set when called by runPatches
 */
const patch_0_0_3 = async () => {
  await chrome.storage.sync.clear();
}

/**
 * Add patch functions here.
 * The patch index will be stored in the extension data set
 */
const PATCHES = [
  patch_0_0_3
];

/**
 * Runs any pending updates based on the version of the extension per the manifest.
 */
const runPatches = async () => {

  let data = await chrome.storage.sync.get(null);
  let index = data.patchIndex || 0;
  let i, count = 0;

  for (i = index; i < PATCHES.length; i++) {
    console.log(`Running patch ${i}`);
    await PATCHES[i].call(this, i);
    count++;
  }

  if(count > 0) {
    // Reload the data
    data = await chrome.storage.sync.get(null);
    console.log(`Updating patch index to ${i}`);
    data.patchIndex = i;
    await chrome.storage.sync.set(data);
  }
}


/*****************************************************************************
 * END PATCHES
 *****************************************************************************/

const main = async () => {

  await runPatches();

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
    if (message.action === 'update_options') {
      (async () => {
        await loadOptionsSync();
        await setBadgeValue();
        sendResponse();
      })();
    }
    return true;
  });

  chrome.action.setBadgeBackgroundColor(
    {color: '#32CD32'}, // LimeGreen
    () => {}
  );  

  await loadOptionsSync();
  await setBadgeValue();
}

(async () => {
  await main();
})();


