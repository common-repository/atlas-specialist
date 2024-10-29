/**
 * Constructor for public Atlas Specialist functionalities
 */
var AtlasSpecialist = function(){
	var self = this;

	this.refs = {};
	this.opts = {
		appUrl: 'https://app.atlashelp.net'
	}

	// util functions
	this.utils = {
		/**
		 * Generic Ajax call method
		 * @since 1.1.0
		 * 
		 * @param {String} url - url to method
		 * @param {Object} data - data to send to server
		 * @param {String} type - POST, GET
		 * 
		 * @return {Promise} - jQuery promise
		 */
		ajaxCall: function(url, data, type){
			return jQuery.ajax({
				async: true,
				dataType: "json",
				type: type || "POST",
				data: typeof data === "object" ? JSON.stringify(data) : data,
				url: self.opts.appUrl + '/public/call/' + url,
				contentType: "application/json; charset=utf-8"
			});
		},
		/**
		 * Save data to localstorage if present
		 * @since 1.1.0
		 * 
		 * @param {String} key - key of data to be saved
		 * @param {Object} data - data to save
		 * 
		 * @return {void}
		 */
		saveToLocalStorage: function(key, data){
			if(typeof localStorage !== 'undefined'){
				try{
					localStorage.setItem(key, JSON.stringify(data));
				}catch(e){
					console.log('No local storage');
				}
			}
		},
		/**
		 * Get data from localStorage if present
		 * @since 1.1.0
		 * 
		 * @param {String} key - key of data to get
		 * 
		 * @return {Object} - returns found object or empty object if nothing found
		 */
		getFromLocalStorage: function(key){
			var data;
			
			try{
				data = localStorage.getItem(key);
			}catch(e){
				console.log('No local storage');
			}

			if(data){
				return JSON.parse(data)
			}else{
				return {};
			}
		}
	};

	if (atlasSpecialistOptions.chatEnable !== '0') {
		this.addAtlasSpecialistChat();
	}

	this.displaySpecialistCalendar();
};

/**
 * Adds the live chat functionality
 * @since 1.0.0
 */
AtlasSpecialist.prototype.addAtlasSpecialistChat = function(){
	var self = this,
		chatContainer,
		isCollapsed,
		iframeW, iframeH, mobile = false,
		width = jQuery(window).width();
		
	if(width < 801){
		mobile = true;
	}else{
		mobile = false;
	}
	isCollapsed = self.utils.getFromLocalStorage('atlas-chat').collapsed || (mobile ? true : false);
	
	function onWidthChange(){
		var width = jQuery(window).width();

		if(width < 801){
			mobile = true;
		}else{
			mobile = false;
		}
		
		if(mobile && !isCollapsed){
			jQuery(document.body).addClass('atlas-chat-body-owr');
		}else{
			jQuery(document.body).removeClass('atlas-chat-body-owr');
		}
	}

	onWidthChange();
		
	jQuery(document.body).append('<div id="atlas-specialist-chat" class="'+ (isCollapsed ? 'atlas-chat-collapsed' : '') +'">\
						<div class="asc-header">\
							<p>'+ (atlasSpecialistOptions.chatTitle || 'Live Chat') +'</p>\
							<button><i class="atlas-collapse-trigger '+ (isCollapsed ? 'atlas-icon-up-open' : 'atlas-icon-down-open') +'"></i></button>\
						</div>\
						<iframe src="'+ self.opts.appUrl +'/public-chat.html?profileURL=' + (atlasSpecialistOptions.url || 'atlas') + '&language='+ atlasSpecialistOptions.locale +'&embedded=true&parent='+ encodeURIComponent(window.location.origin) +'"></iframe>\
					</div>');

	var viewport = jQuery('head').find('meta[name="viewport"]');

	if(viewport.length){
		viewport.attr('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=0');
	}else{
		jQuery('head').append('<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=0">')
	}
	
	chatContainer = jQuery('#atlas-specialist-chat');

	if(chatContainer.hasClass('atlas-chat-collapsed')){
		chatContainer.css('bottom', '-' + (chatContainer.height() - (mobile ? 41 : 27)) + 'px');
	}
	
	// collapse expand functionality
	chatContainer.find('.asc-header').on('click', function () {
		if (chatContainer.hasClass('atlas-chat-collapsed')) {

			chatContainer.removeClass('atlas-chat-collapsed');
			chatContainer.css('bottom', '');
			chatContainer.find('.atlas-collapse-trigger').removeClass('atlas-icon-up-open').addClass('atlas-icon-down-open');

			if(mobile){
				jQuery(document.body).addClass('atlas-chat-body-owr');
			}
			
			isCollapsed = false;
		} else {
			chatContainer.addClass('atlas-chat-collapsed');
			chatContainer.css('bottom', '-' + (chatContainer.height() - (mobile ? 41 : 27)) + 'px');
			chatContainer.find('.atlas-collapse-trigger').removeClass('atlas-icon-down-open').addClass('atlas-icon-up-open');
			
			if(mobile){
				jQuery(document.body).removeClass('atlas-chat-body-owr');
			}
			isCollapsed = true;;
		}
		
		self.utils.saveToLocalStorage('atlas-chat', {collapsed: isCollapsed});
	});

	iframeW = chatContainer.width();
	iframeH = chatContainer.height();

	window.addEventListener("message", function(event){
		if(event.origin === self.opts.appUrl){
			if(event.data){
				// we do not need expand on mobile
				if(jQuery(window).width() < 801){
					return;
				}

				if(event.data === 'expand'){
					chatContainer.css({
						width: iframeW + 100,
						height: iframeH + 200
					});
				}else{
					chatContainer.css({
						width: iframeW,
						height: iframeH
					});
				}
			}
		}

	}, false);

	jQuery(window).on('resize', function(){
		onWidthChange();
	});
	
	setTimeout(function(){
		var chatParent = chatContainer.parent()[0];
		
		if(chatParent.nodeName.toLowerCase() !== 'body'){
			jQuery(document.body).append(chatContainer);
		}
	}, 2000);
}

/**
 * Add calendar for all instances found
 * @since 1.1.0
 */
AtlasSpecialist.prototype.displaySpecialistCalendar = function(){
	var self = this,
		monthNameList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
		now = new Date(),
		calendar = jQuery('.atlas-app-calendar');

	// if now calendars found on page do not execute the rest
	if(!calendar.length){
		return false;
	}

	// get appointments for current month
	self.utils.ajaxCall('getAllForProvider', {"data":now.getFullYear() + ' ' + monthNameList[now.getMonth()], url: atlasSpecialistOptions.url}).done(function(data){

		if(data && data.obj){
			// helper function to construct the date as needed for calendar plugin
			function getStartDate(sd){
				var date = new Date(sd),
					month = date.getMonth() + 1,
					day = date.getDate();

				return date.getFullYear() + '-' + (month > 9 ? month : '0' + month) +'-' + (day > 9 ? day : '0' + day);
			}

			function constructAppsList(data){
				var appointments = [],
					appObj = {}, sd, ed, interval,
					appDate, i, key;

				for(i=0;i<data.obj.length;i++){
					sd = new Date(data.obj[i].sd);
					ed = new Date(data.obj[i].ed);
					appDate = getStartDate(data.obj[i].sd);

					interval = sd.getHours() + ':' + ( sd.getMinutes() > 9 ? sd.getMinutes() : '0' + sd.getMinutes() ) + ' - ' +  ed.getHours() + ':' + ( ed.getMinutes() > 9 ? ed.getMinutes() : '0' + ed.getMinutes() )

					if(appObj.hasOwnProperty(appDate)){
						appObj[appDate].title = appObj[appDate].title + ' \n' + data.obj[i].title + ' ' + interval;
					}else{
						appObj[appDate] = {
							date: appDate,
							badge: true,
							title: data.obj[i].title + ' ' + interval,
							classname: 'atlas-appointment'
						}
					}

				}

				for(key in appObj){
					appointments.push(appObj[key]);
				}

				return appointments;
			};

			calendar.zabuto_calendar({
				language: atlasSpecialistOptions.locale,
				today: true,
				data: constructAppsList(data),				
				action_nav: function(a, b) { // on nav action, get appointments for the selected month
					var data = jQuery(this).data(),
						dateTo = data.to.year + ' ' + monthNameList[data.to.month -1];

					// get appointments for the selected month
					self.utils.ajaxCall('getAllForProvider', {"data":dateTo, url: atlasSpecialistOptions.url}).done(function(data){

						// trigger change of data to update calendar ui
						calendar.data('jsonData', constructAppsList(data)).trigger('zabutoChangeData')
					});
				},
				action: function() {
					var hasEvent = jQuery("#" + this.id).data("hasEvent"),
						url = self.opts.appUrl + '/' + atlasSpecialistOptions.url;

					if(hasEvent){
						window.open(url,'_blank');
					}
				}
			});
		}
	});
};

jQuery(function(){
	new AtlasSpecialist();	
});