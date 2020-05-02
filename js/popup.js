const icons = {
    onlineIcon :   chrome.extension.getURL("icons/online-icon.png"),
    offlineIcon :   chrome.extension.getURL("icons/offline-icon.png"),
    newMessageicon :   chrome.extension.getURL("icons/new-message-icon-1.png"),
    typingIcon :   chrome.extension.getURL("icons/typing.png")
};

$("#start").click(function() {
    takeAction("start");
});
$("#stop").click(function() {
    takeAction("stop");
});
updateTrackedProfile();
selectHistory();

function returnTheElement(array,name){
      for(var i = 0; i < array.length; i++)
          if (array[i].name === name)
              break;
      if(i >= array.length){
              return null;
       }
    return array[i];
}

function returnTheLastElement(array){
   return array[array.length-1];
}

chrome.storage.local.get(['trackedProfile',"state","trackedProfileImg","profiles","averages"],function (result) {
    $("#trackedProfile").text(result.trackedProfile);
    $("#profiles option:selected").text(result.trackedProfile);
    $("#stat").text(result.state);
    updateStateIcon(result.state);
    updateTrackedProfileImg(result.trackedProfileImg);
});

chrome.storage.local.get(['trackedProfile',"profiles","averages"], function(result) {
    if (result.trackedProfile){
        $('#profiles').show();
        getHistory(result.profiles,result.trackedProfile);
        averageState(result.profiles,result.trackedProfile,result.averages);
        fastReply(result.profiles,result.trackedProfile,result.averages);
        const average = returnTheElement(result.averages,result.trackedProfile);
        updateAvergaes(returnTheLastElement(average.online),returnTheLastElement(average.offline),returnTheLastElement(average.reply));
    }else {
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
        );
    }

});
function updateAvergaes(online,offline,reply) {
    $('#average-online').text('average online '+humanizeDuration(online,{ maxDecimalPoints: 1 }));
    $('#average-offline').text('average offline '+humanizeDuration(offline,{ maxDecimalPoints: 1 }));
    $('#average-reply').text('average reply '+humanizeDuration(reply,{ maxDecimalPoints: 1 }));
}
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
            "tabId": tabs[0].id,
            "windowId": tabs[0].windowId
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
                    var profile = returnTheElement(profiles,response.trackedProfile);
                    if (!profile) {
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
                    var profile = returnTheElement(result.profiles,response.trackedProfile);
                    if(profile){
                        profile.history.push({
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
                chrome.storage.local.get(['trackedProfile','averages'], function(result) {
                    var profiles = changes.profiles.newValue;
                    var profile = returnTheElement(changes.profiles.newValue,result.trackedProfile);
                    var oldprofile = returnTheElement(changes.profiles.oldValue,result.trackedProfile);
                    console.log("cleaning",profile);
                    var history = profile.history;

                    var j;
                    for (j = history.length - 1; j >= 0; j--) {
                        if (history[j].state === "online" )
                            break;
                    }
                    j= history.length-1;
                    if(j > 0){
                        var messages = profile.history[j].messages || [];
                        if (messages.length > 0) {
                            var oldMessages = oldprofile.history[j].messages || [];
                            messages = profile.history[j].messages;
                            if (messages.length > oldMessages.length || typeof(oldMessages) === "undefined") {
                                appendMessage([history[j].messages[history[j].messages.length - 1]], history[j].stateAt);
                            }
                        }
                        if (history.length > oldprofile.history.length) {
                            appedStateElement(history[history.length - 1], new Date().valueOf(), 1);
                            averageState(profiles,result.trackedProfile,result.averages);
                            fastReply(profiles,result.trackedProfile,result.averages);
                        }
                    }

                });
            }if (key === 'trackedProfile'){
                 $("#trackedProfile").text(changes.trackedProfile.newValue);
                 $("#profiles option:selected").text(changes.trackedProfile.newValue);
                 getHistory(changes.trackedProfile.newValue);
                 updateTrackedProfileImg(changes.trackedProfile.newValue);
            }
            if(key === 'averages'){
                chrome.storage.local.get(['trackedProfile'],function (result) {
                    var average = returnTheElement(changes.averages.newValue,result.trackedProfile);
                    updateAvergaes(returnTheLastElement(average.online),returnTheLastElement(average.offline),returnTheLastElement(average.reply))
                });
            }
        }
    });
}


function calculatDuration(moment1, moment2) {
    var m1 = moment(moment1),
        m2 = moment(moment2);
    var duration = moment.duration(m2.diff(m1));
    var durationAsMilliseconds = duration.as('milliseconds');
    return humanizeDuration(durationAsMilliseconds,{ maxDecimalPoints: 3 });
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
    }else if(obj1.state === "Connection error"){
        Eclass = 'bg-warning'
    }
    if (wh == null) {
        $("#list").append('<li id="o' + obj1.stateAt + '" class="state  ' + Eclass + '">' + obj1.state + ' ' + d.toDateString() + ' :: ' + extractTime(d) + '<br><div data-toggle="tooltip" title="'+calculatDuration(x, y)+'" class="duration">' + calculatDuration(x, y) + '</div></li>');
    } else {
        $("#list").prepend('<li id="o' + obj1.stateAt + '" class="state ' + Eclass + '">' + obj1.state + ' ' + d.toDateString() + ' :: ' + extractTime(d) + '<br><span class="duration">' + calculatDuration(x, y) + '</span></li>');
        $("#o" + obj1.stateAt).prepend('<ul class="online-actions"></ul>');
    }
    var mes = obj1.messages || [];
    if (mes.length) {
        $("#o" + obj1.stateAt).prepend('<ul class="online-actions"></ul>');
        var mClass = '';
        for (var i = 0; i < obj1.messages.length; i++) {
            if(obj1.messages[i].messages === 'New message' || obj1.messages[i].messages === "typing"){
                mClass = ' d-flex justify-content-start';
            }else {
                mClass = ' d-flex justify-content-end'
            }
            $("#o" + obj1.stateAt + ' > ul').prepend(formateMessage(obj1.messages[i], obj1.stateAt,mClass));
        }
    }
}

function formateMessage(message, repTime,mClass) {
    var src = '';
    if (message.messages === "typing"){
        src = icons.typingIcon
    }else if (message.messages === "New message" || message.messages === "Sent message"){
        src = icons.newMessageicon
    }
   return '<li class="messag '+mClass+'"><img class="messagesIcon" src="'+src+'">' + message.messages + ' <br><div class="duration" data-toggle="toolip" title="'+calculatDuration(message.messageAt, repTime)+'" >' + calculatDuration(message.messageAt, repTime) + '</div></li>';
}



function appendMessage(messages, onTime) {
    for (var i = 0; i < messages.length; i++) {
        var mClass = '';
        if(messages[i].messages === 'New message'){
            mClass = 'd-flex justify-content-start';
        }else {
            mClass = 'd-flex justify-content-end'
        }
        $("li:first > ul").prepend(formateMessage(messages[i], onTime,mClass));
    }
}

function getHistory(profiles,profile) {
        $('#list').empty();
        var theprofile = returnTheElement(profiles,profile);
        if(theprofile){
            var history = theprofile.history || [];
            var l = history.length - 1;
            var a = l % 10,
                b = l - a - 9;
            if (l > 0 && a >= 0) {
                for (var j = l; j >= b; j--) {
                    if (j === l) {
                        appedStateElement(history[j], new Date().valueOf(), null);
                    }
                    if (j < l && j >= 1) {
                        appedStateElement(history[j], history[j + 1].stateAt, null);
                    }

                }
            } else {
                $("#list").prepend('<li>no data found</li>')
            }
            $(window).scroll(function() {
                if ($(window).scrollTop() == $(document).height() - $(window).height() && b > 0) {
                    for (var j = b - 1; j > b - 11; j--) {
                        if (j < history.length - 1 && j >= 1)
                            appedStateElement(history[j], history[j + 1].stateAt, null);
                    }
                    b = b - 10;
                }
            });
        }

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

        options.change(function() {
            var profile = $("#profiles option:selected").text();
            getHistory(profiles,profile);
        })
    });

}

function fastReply(profiles,profile,averages) {
        var theprofile = returnTheElement(profiles,profile);
        var history = theprofile.history;
        var messages;
        var sentMsgAt = 0,replyMsgAt = 0;
        var bool = 0,c=0,d = moment(0);
        for(var i = 0; i <  history.length; i++){
            messages = history[i].messages || [];
            if(messages.length){
                for(var j = 0; j < messages.length;j++){
                    if(messages[j].messages === "Sent message" && bool === 0){
                        sentMsgAt = messages[j].messageAt;
                        bool = 1;
                    }else if(messages[j].messages === "New message" && bool){
                        c++;
                        replyMsgAt = messages[j].messageAt;
                            replyMsgAt = moment(replyMsgAt);
                            sentMsgAt = moment(sentMsgAt);
                            var duration = moment.duration(replyMsgAt.diff(sentMsgAt)).locale("en");
                            d.add(duration.as("milliseconds"),"milliseconds");
                            bool = 0;
                    }
                }
            }
        }
        d = d.diff(moment(0));
        d = d/c;
        console.log('reply',humanizeDuration(d));
        var average = returnTheElement(averages,profile);
        var averageReply = average.reply;
        console.log(averageReply);
        if(d !== returnTheLastElement(averageReply)){
            averageReply.push(d);
            chrome.storage.local.set({'averages': averages});
        }
        console.log(averages);

}

function averageState(profiles,profile,averages) {
        var bool = 0,c=0;
        var onAt=0,ofAt=0;
        var theprofile = returnTheElement(profiles,profile);
        var history = theprofile.history || [];
        if(history.length){
            var j;
            bool =0;
            c=0;
            onAt =0;
            ofAt =0;
            var d1=moment(0);
            for (j=0;j<history.length;j++){
                if (history[j].state === "online" && !bool){
                    onAt = history[j].stateAt;
                    bool = 1;
                }else if(history[j].state === "offline" && bool){
                    c++;
                    onAt = moment(onAt);
                    ofAt = moment(history[j].stateAt);
                    var duration1 = moment.duration(ofAt.diff(onAt)).locale("en");
                    d1.add(duration1.as("milliseconds"),"milliseconds");
                    bool = 0;
                }
            }
            d1 = d1.diff(moment(0)) / c;
            bool =0;c=0;onAt =0;ofAt =0;
            var d2=moment(0);
            for (j=0;j<history.length;j++){
                if (history[j].state === "offline" && !bool){
                    onAt = history[j].stateAt;
                    bool = 1;
                }else if(history[j].state === "online" && bool){
                    c++;
                    onAt = moment(onAt);
                    ofAt = moment(history[j].stateAt);
                    var duration2 = moment.duration(ofAt.diff(onAt)).locale("en");
                    d2.add(duration2.as("milliseconds"),"milliseconds");
                    bool = 0;
                }
            }
            d2 = d2.diff(moment(0)) / c;
        }

         var average = returnTheElement(averages,profile);
        if(!average){
            averages.push({
                name:profile,
                online:[],
                offline:[],
                reply:[]
            });
            average = returnTheLastElement(averages);
        }
        if(returnTheLastElement(average.online) !== d1)
            average.online.push(d1);

       if(returnTheLastElement(average.offline) !== d2)
           average.offline.push(d2);

        chrome.storage.local.set({'averages': averages});
}