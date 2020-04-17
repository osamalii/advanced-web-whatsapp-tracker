$(function() {
	var updatestat;
	var audioCounteron = 0;
	var audioCounteroff = 0;
	var state = 0;
	var onlineaudio = new Audio();
	onlineaudio.src = chrome.extension.getURL("sounds/online.mp3");
	var offlineaudio = new Audio();
	offlineaudio.src = chrome.extension.getURL("sounds/offline.mp3");
	var typingaudio = new Audio();
	typingaudio.src = chrome.extension.getURL("sounds/typing.mp3");
    var noIMG = chrome.extension.getURL("img/noImg.jpeg");
	function beforeStartTracking() {
		var imageProfile = $("._1WliW");
		if (imageProfile.length) {
			clearInterval(waitload);
			chrome.runtime.onMessage.addListener(
				function(request, sender, sendResponse) {
					if (request.action === "start") {
						var profile = getProfile(), profileImg = getProfileImg();
						trackProfile(profile);
						sendResponse({
							startResponse: "track started",
							trackedProfile: profile,
							trackedProfileImg : profileImg
						});
					}
				});
		}

	}

	function getProfile() {
		return $("header ._1wjpf")[0].innerText;
	}
	function getProfileImg() {
		return $('#main ._1WliW > ._3FXB1 ').attr("src") || noIMG ;
	}

	var waitload = setInterval(beforeStartTracking, 1000);

	function trackProfile(profile) {
		updatestat = setInterval(function() {
			getstat(profile);
		}, 1000);
		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				if (request.action === "stop") {
					clearInterval(updatestat);
					sendResponse({
						stopResponse: "track stoped",
						trackedProfile: getProfile()
					});
				}

			});
	}
	var numMessages= -1,typingonoff=0;
	function getstat(profile) {

		var i,num;
		var a = 100;
		var promise = new Promise(function (resolve,reject) {
			var chats = document.getElementsByClassName('_2EXPL');
			for (i = 0; i < chats.length; i++){
				var name = chats[i].childNodes[1].firstElementChild.firstElementChild.textContent;
				console.log(chats[i].clientHeight);
				if(a >= chats[i].clientHeight * (chats.length-1)){
					a=0;
				}
				if(name === profile){
					console.log(name,profile);
					if(chats[i].childNodes[1].lastElementChild.lastElementChild.firstElementChild.textContent === ''){
						num =0
					}else{
						num = chats[i].childNodes[1].lastElementChild.lastElementChild.firstElementChild.lastElementChild.lastElementChild.textContent || '0';
					}
					resolve(num);
					return
				}
			}
			document.getElementById('pane-side').scroll(0,a);
			a+=chats[i].clientHeight;
		});
		promise.then(function(res){
			console.log(parseInt(res,10));
			if(parseInt(res,10) > 0 && numMessages !== res){
				chrome.runtime.sendMessage({
					changeState: 'New message',
					name: getProfile()
				});
				numMessages = res;
			}
		});
            var onlineEle = $("header .O90ur") || [];
			//connectivity = $('.B-eJw').text();
			//console.log(connectivity);

			if(onlineEle.length){
			if (onlineEle.text() === "online") {
				audioCounteron++;
				audioCounteroff = 0;
				if (audioCounteron < 6) {
					onlineaudio.play();
				}
				typingonoff =1;
			}
			if (onlineEle.text() === "typing…") {
				typingaudio.play();
				console.log("typing...");
				if(typingonoff)
					if(typingonoff)
						chrome.runtime.sendMessage({
							changeState: "typing",
							name: getProfile()
						});
				typingonoff =0;
			}
			if(onlineEle.text() === "recording audio…"){
				console.log("recording audio…");
				chrome.runtime.sendMessage({
					changeState: "recording audio",
					name: getProfile()
				});
				typingonoff =1;
			}
			if (!state) {
				state = 1;
				console.log(profile + " is online");
				chrome.runtime.sendMessage({
					changeState: "online",
					name: getProfile()
				});
			}
		} else {
			audioCounteroff++;
			audioCounteron = 0;
			typingonoff =1;
			if (audioCounteroff < 6) {
				offlineaudio.play();
			}
			//
			if (state) {
				console.log(profile + " is offline");
				state = 0;
				chrome.runtime.sendMessage({
					changeState: "offline",
					name: getProfile()
				});
			}
		}
	}
});
