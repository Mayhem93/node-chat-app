var escape = function (str) {
	return str
			.replace(/[\\]/g, '\\\\')
			.replace(/[\"]/g, '\\\"')
			.replace(/[\/]/g, '\\/')
			.replace(/[\b]/g, '\\b')
			.replace(/[\f]/g, '\\f')
			.replace(/[\n]/g, '\\n')
			.replace(/[\r]/g, '\\r')
			.replace(/[\t]/g, '\\t');
};

String.prototype.htmlEntitiesEncode = function() {
	return this.replace(/[\u00A0-\u99999<>\&]/gim, function(i) {
		return '&#'+i.charCodeAt(0)+';';
	});
};

$(document).ready(function(){
	const MSG_LOG_IN = 0;
	const MSG_TEXT = 1;
	const MSG_EXIT = 2;
	const MSG_HELLO = 3;
	const MSG_DENIED = 4;
	const MSG_SENT = 5;
	const MSG_FAILED = 6;
	const MSG_USERLIST = 7;
	const MSG_SYS = 8;
	const MSG_MOTD = 9;
	const MSG_PRIVATE = 10;
	const MSG_USER_LEFT = 11;
	const MSG_USER_ENTER = 12;

	const DENY_REASON_IN_USE = 0;	//nickname is already in use

	//used for the input message
	var hasEvent = false;
	var unreadMsgs = 0;
	var activeTab = 'Main';
	var appTitle = 'Morgue Chat - Iureș și Satane (Caterincă)';
	var nickname = '';

	if (localStorage['nickname']) {
		$('#login_input')[0].value = localStorage['nickname'];
	}

	$("#login_input").focus().on("keypress", function(e){
		if (e.which == 13 && this.value.length >= 3) {
			startChat(this.value);
			localStorage['nickname'] = this.value;
		}
	});

	var switchChatTabs = function(to, sw) {
		if (to == activeTab)
			return ;

		escapedName = to.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");
		clickedChatTab = $('#chat_tab_'+ escapedName);

		if (!clickedChatTab.length) {
			clickedChatTab = $('<button id="chat_tab_'+escapedName+'">'+to+'</button>').appendTo('#tabs').on('click', tabClick);
		}

		windowToHide = $('[data-active="1"]').attr('data-active', '0').css({color: 'white'})[0].id.replace("chat_tab_", "");
		clickedChatTab.attr('data-active', '1').css({color: 'red'});
		if (windowToHide == 'Main') {
			$('#content').css({visibility: 'none'});
		} else {
			$('#pm_'+windowToHide).css({display: 'none'});
		}

		if (escapedName != 'Main' && $('#pm_'+ escapedName).length == 0)
			$('#content').after('<div class="_pm_chat" id ="pm_'+escapedName+'"></div>');
		else {
			if (escapedName == 'Main')
				$('#pm_'+ escapedName).css({visibility: 'none'});
			else
				$('#pm_'+ escapedName).css({display: 'block'});
		}
		activeTab = to;
	};

	var closeChatTab = function(tab) {
		escapedName = tab.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");
		$("#pm_"+escapedName+", #chat_tab_"+escapedName).remove();

		windowToShow = $('#tabs > button:last-child').attr('data-active', '1');

		if (windowToShow.attr('data-unavailable') != '1') {
			windowToShow.css({color: 'red'});
		}

		windowToShowEscaped = windowToShow[0].innerHTML.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");

		if (windowToShowEscaped == 'Main')
			$('#content').css({display: 'block'});
		else
			$('#pm_'+windowToShowEscaped).css({display: 'block'});

		activeTab = windowToShow[0].innerHTML;
	};

	var tabClick = function(e) {
		clickedTab = e.target.innerHTML;

		//right mouse click, closes it
		if (e.ctrlKey && clickedTab != 'Main') {
			closeChatTab(clickedTab);
			return ;
		}

		$(e.target).css({fontWeight: "normal"});

		switchChatTabs(clickedTab);
	};

	var nameClick = function(e) {
		if (e.target.innerHTML == nickname)
			return;

		switchChatTabs(e.target.innerHTML);
	};

	var scrollBottom = function(divElement) {
		contentDiv = divElement[0];

		//if (contentDiv.scrollTop > contentDiv.scrollHeight-100)
			contentDiv.scrollTop = contentDiv.scrollHeight;

	};

	$(window).on('focus', function(){
		unreadMsgs = 0;
		document.title = appTitle;
	});

	$('#chat_tab_Main').on('click', tabClick);

	var startChat = function(nick) {
		var chat = new WebSocket('ws://188.25.16.177:8001');
		nickname = nick;
		document.chat = chat;

		$('.server_offline').remove();

		var loadingTimeout = setTimeout(function(){
			if ($('#loading_img').length == 0)
				$('<img id="loading_img" src="loading.gif">').appendTo('body');
			$('#loading_img').animate({opacity: 1}, 1000);
		}, 1000);

		if (!hasEvent) {
			hasEvent = true;
			$("#message_input").on('keypress', function(e){
				insertedText = this.value.trim();

				if (insertedText === '')
					this.value = '';
				else if (e.which == 13 && insertedText !== '') {
					if (document.chat.readyState == 3) {
						$('<p class="error"><strong>Not connected.</strong></p>').appendTo("#content");

						return;
					}

					if ($('#chat_tab_'+activeTab).attr('data-unavailable') == '1') {
						this.value = '';
						return;
					}

					escapedMsg = escape(this.value);
					escapedNickname = escape(nickname);

					if (activeTab == 'Main') {
						document.chat.send('{"type": 1, "content": "'+escapedMsg+'", "from": "'+escapedNickname+'"}');
					} else {
						document.chat.send('{"type": 10, "content": "'+escapedMsg+'", "from": "'+escapedNickname+'", "to": "'+activeTab+'"}');
					}

					this.value = '';
				}
			});
		}

		chat.onmessage = function(e){
			msg = JSON.parse(e.data);

			msg.ts = msg.ts ? msg.ts : new Date().getTime();
			time = new Date(msg.ts);
			var timeStr = lpad(time.getHours(), 2)+":"+lpad(time.getMinutes(), 2)+":"+lpad(time.getSeconds(), 2);

			if ([MSG_TEXT, MSG_MOTD, MSG_PRIVATE].indexOf(msg.type) !== -1) {
				msg.content = msg.content.htmlEntitiesEncode();
				if ((msg.content.search('http://') !== -1) || (msg.content.search('https://') !== -1)) {
					linkStart = msg.content.search('http');
					linkEnd = msg.content.indexOf(' ', linkStart+1);

					if (linkEnd === -1)
						linkEnd = msg.content.length;

					firstPart = msg.content.slice(0, linkStart);
					lastPart = msg.content.slice(linkEnd, msg.content.length);
					link = msg.content.slice(linkStart, linkEnd);

					msg.content = firstPart+'<a href="'+link+'" target="_blank">'+link+'</a>'+lastPart;
				}
			}

			switch(msg.type) {
				case MSG_HELLO: {
					$('<p>['+timeStr+'] <strong>'+msg.content+'</strong></p>').appendTo("#content");
					scrollBottom($('#content'));

					break;
				}

				case MSG_USERLIST: {
					user_list = $("#user_list");
					user_list.children(':not(span)').remove();

					$('#user_list > span')[0].innerHTML = "&lt;Userlist ("+msg.content.length+")&gt;";

					for(i in msg.content) {
						$('<div class="user"><p>'+msg.content[i]+'</p></div>').appendTo('#user_list');

						if (msg.content[i] !== nickname)
							$('#user_list').children('div').on('click', nameClick);
					}

					break;
				}

				case MSG_TEXT: {
					line = $('<p>['+timeStr+'] &lt;<strong>'+msg.from+'</strong>&gt;: '+msg.content+'</p>').appendTo("#content");
					if (msg.from == nickname)
						line.children('strong').css({color: 'cornflowerblue'});

					if(!document.hasFocus()) {
						unreadMsgs++;
						document.title ='('+unreadMsgs+') Unread Messages!';
					}

					scrollBottom($('#content'));
					break;
				}

				case MSG_PRIVATE: {
					// is this is my message or not ?
					divID = msg.from == nickname ? msg.to : msg.from;
					escapedName = divID.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");
					chatTab = $('#chat_tab_'+escapedName);

					if (chatTab.length) {
						$('<p>['+timeStr+'] &lt;<strong>'+msg.from+'</strong>&gt;: '+msg.content+'</p>').appendTo('#pm_'+escapedName);
						if (chatTab[0].innerHTML != activeTab)
							chatTab.css({color: "red", fontWeight: "bold"});
					} else {
						$('#content').after('<div class="_pm_chat" id ="pm_'+escapedName+'"></div>');

						if (activeTab == 'Main') {
							$('#content').css({visibility: "none"});
						} else {
							$('#pm_'+activeTab).css({display: "none"});
						}

						$('<button id="chat_tab_'+escapedName+'">'+divID+'</button>').appendTo('#tabs');
						$('[data-active="1"]').attr('data-active', '0');
						$('#chat_tab_'+escapedName).css({color: "red"}).attr('data-active', '1').on('click', tabClick);
						$('<p>['+timeStr+'] &lt;<strong>'+msg.from+'</strong>&gt;: '+msg.content+'</p>').appendTo('#pm_'+escapedName);

						activeTab = divID;
					}

					scrollBottom($('#pm_'+divID));

					break;
				}

				case MSG_SYS: {
					$('<p>['+timeStr+'] <strong>*SYSTEM*</strong> '+msg.content+'</p>').appendTo("#content");
					scrollBottom($('#content'));

					break;
				}

				case MSG_USER_LEFT: {
					$('<p>['+timeStr+'] <strong>*SYSTEM*</strong> '+msg.content+' has left Chat! </p>').appendTo("#content");
					escapedNickname = msg.content.replace(/[^a-z0-9]/gmi, "_").replace(/\s+/g, "_");

					openedTab = $('#chat_tab_'+escapedNickname);

					if (openedTab.length) {
						openedTab.css({color: 'grey'});
						openedTab.attr('data-unavailable', '1');
						$('<p>['+timeStr+'] <strong>*SYSTEM*</strong> '+msg.content+' has left Chat! </p>').appendTo('#pm_'+escapedNickname);
					}

					scrollBottom($('#content'));

					break;
				}

				case MSG_USER_ENTER: {
					$('<p>['+timeStr+'] <strong>*SYSTEM*</strong> '+msg.content+' has entered Chat! </p>').appendTo("#content");

					openedTab = $('#chat_tab_'+msg.content);

					if (openedTab.length) {
						openedTab.css({color: 'red'});
						openedTab.attr('data-unavailable', '0');
						$('<p>['+timeStr+'] <strong>*SYSTEM*</strong> '+msg.content+' has entered Chat! </p>').appendTo('#pm_'+msg.content);
					}

					scrollBottom($('#content'));

					break;
				}

				case MSG_MOTD: {
					$('<p class="msg-motd">['+timeStr+"] <strong>*MESSAGE OF THE DAY*</strong>\n"+msg.content+'</p>').appendTo("#content");
					scrollBottom($('#content'));

					break;
				}

				case MSG_DENIED: {
					switch(msg.reason) {
						case DENY_REASON_IN_USE: {
							alert('Nickname is already in use by another user. Please choose another.');
							window.location.reload();

							break;
						}
					}

					break;
				}
			}
		};

		chat.onopen = function(){
			clearTimeout(loadingTimeout);
			$("#loading_img, #login, .reconect").remove();
			escapedNickname = escape(nickname);
			chat.send('{"type": 0, "content": "'+escapedNickname+'"}');
		};

		chat.onclose = function(ev){
			if (ev.code === 1006) {
				time = new Date();
				timeStr = lpad(time.getHours(), 2)+":"+lpad(time.getMinutes(), 2)+":"+lpad(time.getSeconds(), 2);

				if ($('#login').length == 0) {
					if ($('.reconnect').length == 0)
						$('<p style="color: red;">['+timeStr+'] <strong>*SYSTEM* </strong>Abnormal exit. Adica s-a dus serveru\' pă pulă.</p>').appendTo("#content");

					$("#user_list").children("p").remove();

					if ($('.reconnect').length == 0) {
						$('<button class="reconnect">Reconnect</button>').appendTo("#user_list");
						$(".reconnect").on("click", function(){
							$('<p>Reconnecting...</p>').appendTo("#content");
							startChat(nickname);
						});
					}

					scrollBottom();
				}

			}
		};

		chat.onerror = function(ev) {
			if (ev.target.readyState == 0) {
				$('#loading_img').animate({opacity: 0}, 1000);
				if ($('#login_input').length)
					$('#login_input').after('<p class="server_offline">Server must be Offline.</p>');
				else {
					$('<p style="color: red;"><strong>Server offline.</strong></p>').appendTo("#content");
					scrollBottom();
				}
			}
		};

		$("#message_input").focus();
	};

});

function lpad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}