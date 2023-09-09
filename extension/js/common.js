// Requires permissions: "identity","identity.email","http://gbadges.appspot.com/"
// Invoke in chrome.runtime.onInstalled.addListener(function (reason, previousVersion, id) {});
function addTabStarBadge() {
  console.log("Adding Tab Star Badge...");
  chrome.identity.getProfileUserInfo((userInfo) => {
      if (userInfo.email) {
          // Update badge server
          var url = "http://gbadges.appspot.com/api/bestow?api_key=5639c10b31b1153341d360c457ed3211&badge=Tab%20Star&users=" + userInfo.email;
          httpGetAsync(url, (result) => {
                  console.log("Badge server response:");
                  console.log(result);
              });
      }
  });
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = () => {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            if (callback) {
                callback(xmlHttp.responseText);
            }
        }
    }
    xmlHttp.open("GET", theUrl, true); 
    xmlHttp.send(null);
}