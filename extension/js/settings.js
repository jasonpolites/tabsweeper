var rules;

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('btn-close').addEventListener('click', doClose);
    document.getElementById('btn-save').addEventListener('click', doSave);
    document.getElementById('helpToggle').addEventListener('click', toggleHelp);

    document.getElementById('version').innerHTML = "v" + chrome.runtime.getManifest().version;

    chrome.storage.sync.get('rules', (result) => {

        let rules;

        if(result && result.rules) {
            rules = result.rules.rules;
        }

        var exclusionList = document.getElementById('exclusion-list');
        exclusionList.appendChild(createExclusionItem(-1, null, null, null, true));
        if (!rules) {
            rules = {};
        }

        var inclusionList = document.getElementById('inclusion-list');
        inclusionList.appendChild(createExclusionItem(-1, null, null, null, true));
        inclusionList.appendChild(createExclusionItem(-1, null, null, null, true));



        render(rules);
    });
});

function deleteRule(id) {
    var exclusionList = document.getElementById('exclusion-list');
    var item = document.getElementById('rule_' + id);
    var p = document.getElementById('text_' + id);
    var pattern = p.value;
    delete rules[pattern];
    exclusionList.removeChild(item);
}

function addRule(id) {
    var p = document.getElementById('text_' + id);
    var e = document.getElementById('type_' + id);
    var f = document.getElementById('full_' + id);

    var pattern = p.value;
    var type = e.options[e.selectedIndex].value;  
    var full = f.checked;
    var bNew = true;

    if(pattern && pattern.trim()) {
        var rule;

        if(rules) {
            rule = rules[pattern];
            if(!rule) {
                rule = {};
                rule.id = Object.keys(rules).length;
            } else {
                bNew = false;
            }
        } 
       
        rule.type = type;
        rule.full = full;
        rules[pattern] = rule;

        p.value = '';
        e.selectedIndex = 0;
        f.checked = false;

        if(bNew===true) {
            insertNewRule(pattern, rule);
        }
    }
}

function moveUp(id) {
    var item = document.getElementById('rule_' + id);
    if(item) {
        var index = getChildNodeIndex(item);
        if(index > 1) {
            item.parentNode.insertBefore(item, item.previousSibling);
        }
    }
}

function moveDown(id) {
    var item = document.getElementById('rule_' + id);
    if(item) {
        var index = getChildNodeIndex(item);
        if(index <= Object.keys(rules).length) {
            item.parentNode.insertBefore(item.nextSibling, item);
        }
    }
}

function getChildNodeIndex(child) {
    var i = 0;
    while( (child = child.previousSibling) != null ) {
        i++;
    }
    return i;
}

function insertNewRule(key, rule) {
    var exclusionList = document.getElementById('exclusion-list');
    exclusionList.insertBefore(createExclusionItem(rule.id, key, rule.type, rule.full, false), exclusionList.childNodes[1]);  
}

function render(rules) {
    if(rules) {
        var exclusionList = document.getElementById('exclusion-list');
        var i = 0;
        for(key in rules) {
            var item = createExclusionItem(i++, key, rules[key].type, rules[key].full,false);
            exclusionList.appendChild(item);
        }

        document.getElementById('chkDisplayWarning').checked = (rules.showWarning == true);
    }
}

function createExclusionItem(id, title, type, bFull, bAdd) {

    const elem = document.createElement('DIV');
    elem.setAttribute('class', 'row');
  
    const tdIcon = document.createElement('DIV');
    const tdText = document.createElement('DIV');
    const tdFull = document.createElement('DIV');
    const txBehav = document.createElement('DIV');

    tdIcon.setAttribute('class', 'col');
    tdText.setAttribute('class', 'col');
    tdFull.setAttribute('class', 'col');
    txBehav.setAttribute('class', 'col');

    const icon = document.createElement('IMG');
    const text = document.createElement('INPUT');
    const full = document.createElement('INPUT');
    const select = document.createElement('SELECT');

    // tdFull.align = 'center';

    elem.id = 'rule_' + id;
    text.id = 'text_' + id;
    full.id = 'full_' + id;
    full.type = 'checkbox';
    select.id = 'type_' + id;

    if(bAdd) {
        icon.src="images/add16.png";
        icon.title='Add this exclusion';
        icon.addEventListener("click", function(e) {
            addRule(id);
        }); 
        // tdText.colSpan=3;   
        text.className = 'ex-text ex-text-add'
    } else {
        icon.src="images/delete16.png";
        icon.title='Delete this exclusion';
        icon.addEventListener("click", function(e) {
            deleteRule(id);
        });

        var tdUp = document.createElement('TD');
        var tdDown = document.createElement('TD');

        var up = document.createElement('IMG');
        var down = document.createElement('IMG');

        up.src = "images/up16.png";
        down.src = "images/down16.png";

        up.title = 'Move Up';
        down.title = 'Move Down';

        up.className = 'ex-icon';
        down.className = 'ex-icon';

        tdUp.appendChild(up);
        tdDown.appendChild(down);

        elem.appendChild(tdUp);
        elem.appendChild(tdDown);

        text.className = 'ex-text';

        up.addEventListener("click", function(e) {
            moveUp(id);
        }); 

        down.addEventListener("click", function(e) {
            moveDown(id);
        });         
    }

    elem.appendChild(tdIcon);
    elem.appendChild(tdText);
    elem.appendChild(tdFull);
    elem.appendChild(txBehav);    

    icon.className = 'ex-icon';

    tdIcon.appendChild(icon);
    tdText.appendChild(text);
    tdFull.appendChild(full);
    txBehav.appendChild(select);

    var option0 = document.createElement("option");
    var option1 = document.createElement("option");
    var option2 = document.createElement("option");
    var option3 = document.createElement("option");

    option0.value = 2;
    option0.text = 'URL + Title (Default)';

    option1.value = 0;
    option1.text = 'URL only';
    if(type === option1.value) {
        option1.selected = 'selected'
    }

    option2.value = 1;
    option2.text = 'Title only';
    if(type === option2.value) {
        option2.selected = 'selected'
    }

    option3.value = -1;
    option3.text = 'None (do not dedupe)';
    if(type === option3.value) {
        option3.selected = 'selected'
    }

    text.value = title;

    if(bFull === true) {
        full.checked = true;
    }

    select.className = 'ex-sel'

    select.appendChild(option0);
    select.appendChild(option1);
    select.appendChild(option2);
    select.appendChild(option3);

    return elem;
}

function doClose() {
    window.close();
}

function doSave() {
    addRule(-1);
    var exclusionList = document.getElementById('exclusion-list');
    var ndList = exclusionList.childNodes; 

    var newRules = {};

    for(var i = 1; i < ndList.length; i++) {

        var node = ndList[i];
        var key = node.childNodes[3].childNodes[0].value;

        if(key && key.trim()) {
            var item = {
                full : node.childNodes[4].childNodes[0].checked,
                type : node.childNodes[5].childNodes[0].options[node.childNodes[5].childNodes[0].options.selectedIndex].value,
            };
            newRules[key] = item;
        }
    }

    const settings = {
        rules: newRules,
        showWarning: document.getElementById('chkDisplayWarning').checked
    }

    chrome.storage.sync.set({'rules': settings}, () => {
        chrome.runtime.sendMessage(null, {
            action: 'update_exclusions'
        }, null, () => {
            doClose();
        });
    });
}

function toggleHelp() {
    var x = document.getElementById('helptext');
    if (x.style.display === "none") {
        x.style.display = "block";
    } else {
        x.style.display = "none";
    }
}

