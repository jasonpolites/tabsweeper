"use strict";

// Globals
const TYPE_NONE = -1;
const TYPE_URL = 0;
const TYPE_TITLE = 1;
const TYPE_DEFAULT = 2;

const toggleHelp = () => {
  let x = document.getElementById('helptext');
  if (x.style.display === "none") {
      x.style.display = "block";
  } else {
      x.style.display = "none";
  }
}

const doClose = () => {
  window.close();
}

const insertRuleEntry = (rules, rule) => {
  const elemRules = document.getElementById(`rule-list`);
  const elemRow = document.createElement('TR');
  const elemPatternCell = document.createElement('TD');
  const elemUseFullUrlCell = document.createElement('TD');
  const elemDetectionCell = document.createElement('TD');  
  const elemButtonCell = document.createElement('TD');  

  const elemPatternInput = document.createElement('INPUT');
  elemPatternInput.setAttribute('type', 'text');

  const elemUseFullUrlCellInput = document.createElement('INPUT');
  elemUseFullUrlCellInput.setAttribute('type', 'checkbox');

  const elemDetectionInput = document.createElement('SELECT');
  const elemOptionDefault = document.createElement('OPTION');
  const elemOptionURL = document.createElement('OPTION');
  const elemOptionTitle = document.createElement('OPTION');
  const elemOptionNone = document.createElement('OPTION');

  elemOptionDefault.value = TYPE_DEFAULT;
  elemOptionDefault.text = `URL + Title (Default)`;

  elemOptionURL.value = TYPE_URL;
  elemOptionURL.text = `URL only`;

  elemOptionTitle.value = TYPE_TITLE;
  elemOptionTitle.text = `Title only`;

  elemOptionNone.value = TYPE_NONE;
  elemOptionNone.text = `None (do not dedupe)`;

  elemDetectionInput.appendChild(elemOptionDefault);
  elemDetectionInput.appendChild(elemOptionURL);
  elemDetectionInput.appendChild(elemOptionTitle);
  elemDetectionInput.appendChild(elemOptionNone);

  const elemButton = document.createElement('BUTTON');

  elemPatternCell.appendChild(elemPatternInput);

  elemUseFullUrlCell.setAttribute('style', 'text-align: center;');
  elemUseFullUrlCell.appendChild(elemUseFullUrlCellInput);

  elemDetectionCell.appendChild(elemDetectionInput);

  elemButtonCell.appendChild(elemButton);

  elemRow.appendChild(elemPatternCell);
  elemRow.appendChild(elemUseFullUrlCell);
  elemRow.appendChild(elemDetectionCell);
  elemRow.appendChild(elemButtonCell);

  elemRules.appendChild(elemRow);

  if(rule) {
    elemButton.innerHTML = 'Remove';
    elemButton.setAttribute('class', 'btn-small remove');

    elemButton.addEventListener('click', () => {
      removeRule(rules, rule.strUrlPattern);
    });


    elemPatternInput.value = rule.strUrlPattern;
    elemUseFullUrlCellInput.checked = rule.bUseFullUrl;
    
    switch(rule.detectType) {
      case TYPE_DEFAULT:
        elemDetectionInput.selectedIndex = 0;
      break;
      case TYPE_URL:
        elemDetectionInput.selectedIndex = 1;
      break;
      case TYPE_TITLE:
        elemDetectionInput.selectedIndex = 2;
      break;
      case TYPE_NONE:
        elemDetectionInput.selectedIndex = 3;
      break;
    }
  } else {
    // Default row
    elemButton.innerHTML = 'Add';
    elemButton.setAttribute('class', 'btn-small add');
    elemButton.addEventListener('click', () => {
      if(addRule(rules) === true) {
        renderRules(rules);
      }
    });
  }
}

const addRule = (rules) => {
  const elemRules = document.getElementById(`rule-list`);
  const elemRow = elemRules.firstChild;
  const rule = makeRuleFromFormRow(elemRow);

  if(rule.strUrlPattern.trim().length > 0) {
    rules[rule.strUrlPattern] = rule;
    return true;
  }
  return false;
}

const removeRule = (rules, key) => {
  delete rules[key];
  renderRules(rules);
}

const renderRules = (rules) => {
  clearRules();
  // Insert default entry row
  insertRuleEntry(rules);
  if(rules) {
    for (const key in rules) {
      const rule = rules[key];
      insertRuleEntry(rules, rule);
    }
  }
}

const clearRules = () => {
  const elemRules = document.getElementById(`rule-list`);
  while (elemRules.firstChild) {
    elemRules.removeChild(elemRules.firstChild);
  }
}

const updateVersion = () => {
  let version = chrome.runtime.getManifest().version;
  document.getElementById(`version`).innerHTML = `v${version}`;
}

const loadRules = async () => {

  let result = await chrome.storage.sync.get(null);
  let rules = result.rules || {};
  
  document.getElementById('helpToggle').addEventListener('click', toggleHelp);
  document.getElementById('btn-close').addEventListener('click', doClose);
  document.getElementById('btn-save').addEventListener('click', async () => {
    await saveAndClose();
  });

  renderRules(rules);
}

const getRulesFromFormData = () => {
  let rules = {};
  const elemRules = document.getElementById(`rule-list`);
  const children = elemRules.childNodes;
  for (const elemRow of children) {
    const rule = makeRuleFromFormRow(elemRow);
    if(rule.strUrlPattern.trim().length > 0) {
      rules[rule.strUrlPattern] = rule;
    }
  }
  return rules;
}

const makeRuleFromFormRow = (elemRow) => {
  const detectSelect = elemRow.childNodes.item(2).firstChild;
  return {
    strUrlPattern: elemRow.childNodes.item(0).firstChild.value,
    bUseFullUrl: elemRow.childNodes.item(1).firstChild.checked,
    detectType: parseInt(detectSelect.options[detectSelect.selectedIndex].value)
  };  
}

const saveAndClose = async (rules) => {
  rules = getRulesFromFormData();
  let data = await chrome.storage.sync.get(null);
  data.rules = rules;
  await chrome.storage.sync.set(data);
  await chrome.runtime.sendMessage(null, {
    action: 'update_exclusions'
  });
  doClose();
}

document.addEventListener('DOMContentLoaded', async () => {
  updateVersion();
  await loadRules();
});