chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.get(['profiles','averages'], function (result) {
        var profiles = result.profiles || [];
        if (!profiles.length) {
            chrome.storage.local.set({profiles: [],trackedProfile:null});
        }
        var averages = result.averages || [];
        if(!averages.length){
            chrome.storage.local.set({profiles:[]});
        }
    });

});

updatestate();
chrome.storage.local.get(["tabId","windowId"],function (result) {
    chrome.windows.onRemoved.addListener(function (window) {
        console.log(window,result.windowId);
        if(window === result.windowId){
            chrome.storage.local.get(["profiles","trackedProfile"],function (res2) {
                var profiles = res2.profiles;
                var profile = returnTheElement(profiles,res2.trackedProfile);
                console.log(profile);
                if(profile){

                    profile.history.push({
                        state: "track stoped",
                        stateAt: new Date().valueOf()
                    });
                    chrome.storage.local.set({'profiles':profiles});
                }
            })
        }
    });
});


function updatestate() {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.changeState) {
            console.log(sender);
            console.log(request.changeState);
            chrome.storage.local.get(['profiles','trackedProfileImg'], function (result) {
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

                    if (request.changeState === "online" || request.changeState === "offline" || request.changeState === "Connection error") {
                        chrome.notifications.create('', {
                            title: profiles[i].name +' is :',
                            message: request.changeState,
                            iconUrl: result.trackedProfileImg,
                            type: 'basic'
                        });
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
                    }else if(request.changeState === 'Sent message'){
                        if(typeof profiles[i].history[profiles[i].history.length-1].messages === "undefined")
                            profiles[i].history[profiles[i].history.length-1].messages = [];
                        profiles[i].history[profiles[i].history.length-1].messages.push({
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
function returnTheElement(array,name){
    for(var i = 0; i < array.length; i++)
        if (array[i].name === name)
            break;
    if(i >= array.length){
        return null;
    }
    return array[i];
}