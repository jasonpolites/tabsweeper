

document.addEventListener('DOMContentLoaded', () => {

  chrome.storage.sync.get('rules', (result) => {

      let rules;

      if(result && result.rules) {
          rules = result.rules.rules;
      }

      console.log(rules);
  });
});

