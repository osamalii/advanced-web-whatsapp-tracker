$("#start").click(function() {
    takeAction("start");
});
$("#stop").click(function() {
    takeAction("stop");
});

var icons = {
    onlineIcon :   chrome.extension.getURL("icons/online-icon.png"),
    offlineIcon :   chrome.extension.getURL("icons/offline-icon.png")
};
updateTrackedProfile();
selectHistory();

chrome.storage.local.get(['trackedProfile', "state","trackedProfileImg"], function(result) {
    if (result.trackedProfile){
        $('#profiles').show();
        $("#trackedProfile").text(result.trackedProfile);
        $("#profiles option:selected").text(result.trackedProfile);
        $("#stat").text(result.state);
        updateStateIcon(result.state);
        getHistory(result.trackedProfile);
        updateTrackedProfileImg(result.trackedProfileImg);
    }
    else {
        $('#currentProfile').html(
            "<div>" +
            "<p>You haven't tracked any profile." +
            "</p>" +
            "To track a profile:"+
            "<ol>"+
            "<li>open web whatsapp and scan the QR code.</li>"+
            "<li>go to the porfile's conversation that you want to track.</li>"+
            "<li>open the extension and click start tracking.</li>"+
            "<li>there you have it; now each time the tracked profile gets online/offline you'll get notified by sound and green/red (online/offline) dot in the extension icon ,furthermore the history of the track is stored localy. </li>"+
            "<li>to stop tracking go to web whatsapp tab then open the extension then click stop tracking. </li>"+
            "</ol>"+
            "</div>"
        )
    }

});

function updateStateIcon(state) {
    state === "online" ? $("#iconState").attr("src",icons.onlineIcon) : $("#iconState").attr("src",icons.offlineIcon);
}
function updateTrackedProfileImg(ulr) {
   $('#profile').attr("src",ulr);
}
function takeAction(action) {

    chrome.storage.local.set({
       "tracking": action === "start"
    });
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.storage.local.set({
            "tabId": tabs[0].id
        });
        chrome.tabs.sendMessage(tabs[0].id, {
            action: action
        }, function(response) {
            if (response.startResponse === "track started") {
                updateTrackedProfileImg(response.trackedProfileImg);
                chrome.storage.local.set({
                    trackedProfile: response.trackedProfile,
                    trackedProfileImg: response.trackedProfileImg
                });
                chrome.storage.local.get(['profiles'], function(result) {
                    var profiles = result.profiles;
                    var i = 0,
                        exst = 0;
                    while (i < profiles.length && !exst) {
                        if (profiles[i].name === response.trackedProfile) {
                            exst = 1;
                        }
                        i++;
                    }
                    if (!exst) {
                        profiles.push({
                            name: response.trackedProfile,
                            history: []
                        });
                        chrome.storage.local.set({
                            "profiles": profiles
                        })
                    }

                });
            } else {
                chrome.storage.local.get(['profiles'], function(result) {
                    var profiles = result.profiles;
                    var i;
                    for (i = 0; i < profiles.length; i++) {
                        if (profiles[i].name === response.trackedProfile) {
                            break;
                        }
                    }
                    if(i < profiles.length){
                        profiles[i].history.push({
                            state: 'track stoped',
                            stateAt: new Date().valueOf()
                        });
                        chrome.storage.local.set({
                            "profiles": profiles
                        })
                    }
                });
            }

        });
    });
}

function updateTrackedProfile() {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (var key in changes) {
            if (key === "state"){
                $("#stat").text(changes.state.newValue);
                updateStateIcon(changes.state.newValue);

            }
            if (key === "profiles") {
                chrome.storage.local.get(['trackedProfile'], function(result) {
                    var profiles = changes.profiles.newValue;
                    var oldprofiles = changes.profiles.oldValue;
                    var i;
                    for (i = 0; i < profiles.length; i++) {
                        if (profiles[i].name === result.trackedProfile)
                            break;
                    }
                    var history = profiles[i].history;

                    var j;
                    for (j = history.length - 1; j >= 0; j--) {
                        if (history[j].state === "online")
                            break;
                    }
                    if(j > 0){
                        var messages = profiles[i].history[j].messages || [];
                        if (messages.length > 0) {
                            var oldMessages = oldprofiles[i].history[j].messages || [];
                            messages = profiles[i].history[j].messages;
                            //if (typeof(oldMessages) === "undefined")
                            if (messages.length > oldMessages.length || typeof(oldMessages) === "undefined") {
                                appendMessage([history[j].messages[history[j].messages.length - 1]], history[j].stateAt);
                            }

                        }
                        if (history.length > oldprofiles[i].history.length) {
                            appedStateElement(history[history.length - 1], new Date().valueOf(), 1);
                        }
                    }

                });
            }if (key === 'trackedProfile'){
                 $("#trackedProfile").text(changes.trackedProfile.newValue);
                 $("#profiles option:selected").text(changes.trackedProfile.newValue);
                 getHistory(changes.trackedProfile.newValue);
                 updateTrackedProfileImg(changes.trackedProfile.newValue);
            }
            // if(key === "tracking"){
            //     var start = $("#start");
            //     var stop = $("#stop");
            //     if(changes.tracking.newValue){
            //         stop.show();
            //         start.hide();
            //     }else {
            //         stop.hide();
            //         start.show();
            //     }
            // }

        }
    });
}


function calculatDuration(moment1, moment2) {
    var m1 = moment(moment1),
        m2 = moment(moment2);
    var duration = moment.duration(m2.diff(m1));
    var durationAsMilliseconds = duration.as('milliseconds');
    //return moment.duration(m2.diff(m1)).locale("en").humanize();
    return humanizeDuration(durationAsMilliseconds);
}

function appedStateElement(obj1, nextTime, wh) {
    var d = new Date(obj1.stateAt);
    var x = new moment(obj1.stateAt),
        y = new moment(nextTime),
        Eclass = '',
        duration = moment.duration(y.diff(x)).locale("en").humanize();
    if (obj1.state === "online") {
        Eclass = 'bg-light';

    } else if (obj1.state === "offline") {
        Eclass = 'bg-offline'
    } else if (obj1.state === "track stoped") {
        Eclass = 'bg-danger'
    }
    if (wh == null) {
        $("#list").append('<li id="o' + obj1.stateAt + '" class="state  ' + Eclass + '">' + obj1.state + ' ' + d.toDateString() + ' :: ' + extractTime(d) + '<br><span class="duration">' + calculatDuration(x, y) + '</span><ul></ul></li>');
    } else {
        $("#list").prepend('<li id="o' + obj1.stateAt + '" class="state ' + Eclass + '">' + obj1.state + ' ' + d.toDateString() + ' :: ' + extractTime(d) + '<br><span class="duration">' + calculatDuration(x, y) + '</span><ul></ul></li>');
    }
    if (obj1.state === "online" && obj1.messages) {
        for (var i = 0; i < obj1.messages.length; i++) {
            $("#o" + obj1.stateAt).prepend(formateMessage(obj1.messages[i], obj1.stateAt));
        }
    }
}

function formateMessage(message, repTime) {
   return '<li class="messag">' + message.messages + ' ' + calculatDuration(message.messageAt, repTime) + '</li>';
}



function appendMessage(messages, onTime) {
    for (var i = 0; i < messages.length; i++) {
        $("li:first").prepend(formateMessage(messages[i], onTime));
    }
}

function getHistory(profile) {
    chrome.storage.local.get(["profiles", "trackedProfile"], function(result) {
        $('#list').empty();
        var profiles = result.profiles;

        var i;
        for (i = 0; i < profiles.length; i++) {
            if (profiles[i].name === profile) {
                break;
            }
        }
        if(i<profiles.length){
            var history = profiles[i].history || [];
            var l = history.length - 1;
            var a = l % 10,
                b = l - a - 9;
            if (l > 0 && a >= 0) {
                for (var j = l; j >= b; j--) {
                    if (j === l) {
                        appedStateElement(profiles[i].history[j], new Date().valueOf(), null);
                    }
                    if (j < l && j >= 1) {
                        appedStateElement(profiles[i].history[j], profiles[i].history[j + 1].stateAt, null);
                    }

                }
            } else {
                $("#list").prepend('<li>no data found</li>')
            }
            $(window).scroll(function() {
                if ($(window).scrollTop() == $(document).height() - $(window).height() && b > 0) {
                    for (var j = b - 1; j > b - 11; j--) {
                        if (j < profiles[i].history.length - 1 && j >= 1)
                            appedStateElement(profiles[i].history[j], profiles[i].history[j + 1].stateAt, null);
                    }
                    b = b - 10;
                }
            });
        }

    })
}

function extractTime(date) {
    return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

function selectHistory() {
    var options = $('#profiles');
    chrome.storage.local.get(['profiles', 'trackedProfile'], function(result) {
        var profiles = result.profiles;
        for (var i = 0; i < profiles.length; i++)
            if (profiles[i].name !== result.trackedProfile)
                $("#profiles").prepend('<option>' + profiles[i].name + '</option>');
    });

    options.change(function() {
        var profile = $("#profiles option:selected").text();
        getHistory(profile);
    })
}
