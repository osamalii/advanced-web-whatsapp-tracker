$(function() {
	var updatestat,counters = {
		audioCounteron: 0,
		audioCounteroff: 0,
		typingonoff: 0
	},state = 0;
	var onlineaudio = new Audio(),
		offlineaudio = new Audio(),
		typingaudio = new Audio();
	onlineaudio.src = chrome.extension.getURL("sounds/online.mp3");
	offlineaudio.src = chrome.extension.getURL("sounds/offline.mp3");
	typingaudio.src = chrome.extension.getURL("sounds/typing.mp3");
	var noIMG = chrome.extension.getURL("img/noImg.jpeg");

	function beforeStartTracking() {
		var imageProfile = $("._1WliW") || [];
		if (imageProfile.length) {
			clearInterval(waitload);
			chrome.runtime.onMessage.addListener(
				function(request, sender, sendResponse) {
					if (request.action === "start") {
						var profile = getProfile(),
							profileImg = getProfileImg();
						trackProfile(profile);
						sendResponse({
							startResponse: "track started",
							trackedProfile: profile,
							trackedProfileImg: profileImg
						});
					}
				});
		}

	}

	function getProfile() {
		return $("header ._1wjpf")[0].innerText;
	}

	function getProfileImg() {
		return $('#main ._1WliW > ._3FXB1 ').attr("src") || noIMG;
	}

	var waitload = setInterval(beforeStartTracking, 1000);

	function trackProfile(profile) {
		updatestat = setInterval(function() {
			getstat(profile);
		}, 500);
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

	var lastMessageRecieved = $('.message-in:last').html();
	var lastMessageSent = $('.message-out:last').html();

	function sendChangeStateMsg(state, profile) {
		chrome.runtime.sendMessage({
			changeState: state,
			name: profile
		});
	}

	function getstat(profile) {
		var onlineEle = $("header .O90ur") || [],
			connectivity = $('._3YewW').text(),
			mayLastMessageRescieved = $('.message-in:last').html(),
			mayLastMessageSent = $('.message-out:last').html();

		if (lastMessageRecieved !== mayLastMessageRescieved) {
			lastMessageRecieved = mayLastMessageRescieved;
			sendChangeStateMsg("New message", profile);
		}
		if (mayLastMessageSent !== lastMessageSent) {
			lastMessageSent = mayLastMessageSent;
			sendChangeStateMsg('Sent message', profile);
		}

		if (connectivity) {
			if (connectivity === "Reconnect")
			$('.B-eJw').click();
			sendChangeStateMsg("Connection error", profile);
		} else {
			if (onlineEle.length) {
				if (onlineEle.text() === "online") {
					counters.audioCounteron++;
					counters.audioCounteroff = 0;
					if (counters.audioCounteron < 6) {
						onlineaudio.play();
					}
					counters.typingonoff = 1;
				}
				if (onlineEle.text() === "typing…") {
					typingaudio.play();
					console.log("typing...");
					if (counters.typingonoff) {
						sendChangeStateMsg("typing", profile);
						counters.typingonoff = 0;
					}
				}
				if (onlineEle.text() === "recording audio…") {
					console.log("recording audio…");
					sendChangeStateMsg("recording audio", profile);
					counters.typingonoff = 1;
				}
				if (!state) {
					state = 1;
					console.log(profile + " is online");
					sendChangeStateMsg("online", profile);
				}
			} else {
				counters.audioCounteroff++;
				counters.audioCounteron = 0;
				counters.typingonoff = 1;
				if (counters.audioCounteroff < 6) {
					offlineaudio.play();
				}

				if (state) {
					console.log(profile + " is offline");
					state = 0;
					sendChangeStateMsg("offline", profile);
				}
			}
		}

	}
});