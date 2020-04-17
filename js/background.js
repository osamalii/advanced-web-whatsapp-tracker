chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.get(['profiles'], function (result) {
        var profiles = result.profiles || [];
        if (!profiles.length) {
            chrome.storage.local.set({profiles: [],trackedProfile:null});
        }
    });

});

updatestate();



function updatestate() {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.log(request);
        if (request.changeState) {
            var regex = /[a-z]/g;
            var changeState = request.changeState, f1 = changeState.match(regex);
            chrome.storage.local.get(['profiles'], function (result) {
                var profiles = result.profiles;
                var i, j;
                for (i = 0; i < profiles.length; i++)
                    if (profiles[i].name === request.name)
                        break;


                if(i < profiles.length){
                    var date = new Date().valueOf();
                    var lastElement = profiles[i].history[profiles[i].history.length - 1] || '';
                    if (lastElement.state === request.changeState && request.changeState !== "New message") {
                        return;
                    }

                    if (request.changeState === "online" || request.changeState === "offline") {
                        var color = getBadgeBackColor(request.changeState);
                        chrome.browserAction.setBadgeBackgroundColor({color:color});
                        chrome.browserAction.setBadgeText({text:' '});
                        profiles[i].history.push({
                            state: request.changeState,
                            stateAt: date
                        });
                        chrome.storage.local.set({state: request.changeState});
                    } else if (request.changeState === "typing" || request.changeState === "New message") {
                        for (j = profiles[i].history.length - 1; j >= 0; j--) {
                            if (profiles[i].history[j].state === "online") {
                                break;
                            }
                        }
                        if (!profiles[i].history[j].messages) {
                            profiles[i].history[j].messages = [];
                        }
                        profiles[i].history[j].messages.push({
                            messages: request.changeState,
                            messageAt: date
                        });
                    }
                    chrome.storage.local.set({'profiles': profiles});
                }



            });

        }
    })
}

function getBadgeBackColor(state) {
    return state === "online" ? "#2bff00" : "#ff1500";
}