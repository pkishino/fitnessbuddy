angular.module('fitnessBuddy', ['firebase', 'ui.bootstrap', 'angularMoment', 'uiGmapgoogle-maps','ngFacebook'])
	.constant('FIREBASE_URL', 'https://sweltering-heat-7043.firebaseio.com/')
	.factory('Auth', ['FIREBASE_URL',
		function(FIREBASE_URL) {
			var ref = new Firebase(FIREBASE_URL);
			return ref;
		}
	])
	.config(function(uiGmapGoogleMapApiProvider) {
		uiGmapGoogleMapApiProvider.configure({
			key: 'AIzaSyBtnOPyRzQV1GZSAgkF6_4xuTdG6rv_YAw',
			v: '3.17',
			libraries: 'weather,geometry,visualization,places'
		});
	})
	.config(function($locationProvider){
    	$locationProvider.html5Mode(true).hashPrefix('!');
	})
	.config(function($facebookProvider) {
		$facebookProvider.setAppId('1379990932330458');
		$facebookProvider.setVersion("v2.3");
		$facebookProvider.setCustomInit({
			xfbml      : true
		});
		$facebookProvider.setPermissions("user_birthday");
	})
	.run(function($rootScope){
		  (function(d, s, id) {
		    var js, fjs = d.getElementsByTagName(s)[0];
		    if (d.getElementById(id)) return;
		    js = d.createElement(s); js.id = id;
		    js.src = "//connect.facebook.net/en_US/sdk.js";
		    fjs.parentNode.insertBefore(js, fjs);
		  }(document, 'script', 'facebook-jssdk'));
	})
	.controller('EventListCtrl', ['$scope', 'FIREBASE_URL', '$firebaseArray', '$firebaseObject', '$modal', 'Auth','$location', '$http', '$facebook',
		function($scope, FIREBASE_URL, $firebaseArray, $firebaseObject, $modal, Auth, $location, $http, $facebook) {
			$scope.myEvents = [];
			var eventRef = new Firebase(FIREBASE_URL + 'events');
			var query = eventRef.orderByChild('date').limitToLast(25);
			$scope.filteredEvents = $firebaseArray(query);
			$scope.eventlist = $firebaseArray(eventRef);
			$scope.eventlist.$watch(function(event){
				var record;
				if(event.event == "child_added"){
					record = $scope.eventlist.$getRecord(event.key);
					if (record&&$scope.authData&&$scope.authData.uid == record.author){
						$scope.join(record);
					}
					cull();	
				}
			});
			$scope.open = function(size) {
				var modalInstance;
				if (size === undefined) {
					modalInstance = $modal.open({
						templateUrl: 'newEvent.html',
						controller: 'NewEventModalCtrl',
						resolve: {
							authData: function() {
								return $scope.authData;
							}
						}
					});
				} else {
					modalInstance = $modal.open({
						templateUrl: 'viewEvent.html',
						controller: 'ViewEventModalCtrl',
						size: size,
						resolve: {
							event: function() {
								return size;
							}
						}
					});
				}

			};
			$scope.auth = Auth;
			$scope.login = function() {
				var token= $facebook.getAuthResponse().accessToken;
				$scope.auth.authWithOAuthToken("facebook",token ,function(error, authData) { 
					$scope.authData=authData;
					}, {
				  scope: "user_birthday"
				});
			};
			$scope.auth.onAuth(function(authData) {
				$scope.authData=authData;
				if (authData) {
					$scope.ownedRef = new Firebase(FIREBASE_URL + 'users/' + authData.uid);
					$scope.myEventRefs = $firebaseArray($scope.ownedRef);
					$scope.myEventRefs.$watch(function(event){
						getMyEvents();
					});
				}
			});
			$scope.join = function(event) {
				var record = $firebaseArray($scope.ownedRef.orderByChild('event').equalTo(event.$id));
				record.$loaded(function() {
					if(record.length === 0){
						event=$scope.eventlist.$getRecord(event.$id);
						event.count+=1;
						$scope.eventlist.$save(event).then(function(ref){
							$scope.myEventRefs.$add({event:event.$id});	
						});
					}
				}, function(error) {
					console.error('Error:', error);
				});
			};
			$scope.remove = function(id) {
				var record = $firebaseArray($scope.ownedRef.orderByChild('event').equalTo(id));
				record.$loaded(function() {
					if(record.length === 1){
						var remove = record[0];
						event=$scope.eventlist.$getRecord(id);
						event.count-=1;
						$scope.eventlist.$save(event).then(function(ref){
							$scope.myEventRefs.$remove($scope.myEventRefs.$indexFor(remove.$id));
						});
					}
				}, function(error) {
					console.error('Error:', error);
				});
			};
			if($location.search().event!==undefined){
				var eventId = $location.search().event;
				var ref = new Firebase(FIREBASE_URL + 'events/' + eventId);
				var record = $firebaseObject(ref);
				record.$loaded(function() {
					if(record.marker!==undefined){
						$scope.open(record);
					}
				}, function(error) {
					console.error('Error:', error);
				});
			}
			function getMyEvents(){
				if($scope.authData){
					events = [];
					var copy = $scope.myEventRefs;
					for (var i = 0; i < copy.length; i++) {
						var eventId = copy[i].event;
						var event = $scope.eventlist.$getRecord(eventId);
						if (event!==null){
							events[events.length]=event;
						}else{
							$scope.myEventRefs.$remove(i);
						}
					}
					events.sort(compare);
					$scope.myEvents = events;
				}
			}
			function compare(a, b) {
				status = (a.date - b.date);
  				return status;
			}
			function cull(){
				var time = new Date().getTime();
				for (var i = 0; i < $scope.eventlist.length; i++) {
					var event = $scope.eventlist[i];
					if (event.date < time) {
						var item = $scope.eventlist.$getRecord(event.$id);
						$scope.eventlist.$remove(item);
						if ($scope.authData){
							$scope.myEventRefs.$remove(event.$id);
						}
					}
				}
			}
			$scope.shareEvent = function (share_event) {
				var request = $http({
				    method: "post",
				    url: window.location.href + "createFBEvent.php",
				    data: {
				        event: share_event
				    },
				    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
				});

				/* Check whether the HTTP Request is successful or not. */
				request.success(function (data) {
				    if (!isNaN(data)){
						$facebook.ui({
							method: 'share_open_graph',
							action_type: 'fitness-buddy:join',
							action_properties: JSON.stringify({
							  event:data,
							})
						}).then(
							function(response){
								console.log(response);
							},
							function(err){
								console.log(err);
							}
						);
					}
				});
			};
		}
	])
	.controller('NewEventModalCtrl', ['$scope', 'FIREBASE_URL', '$firebaseArray', '$modalInstance', 'uiGmapGoogleMapApi','authData',
		function($scope, FIREBASE_URL, $firebaseArray, $modalInstance, uiGmapGoogleMapApi, authData) {
			$scope.authData = authData;
			var eventRef = new Firebase(FIREBASE_URL + 'events');
			$scope.eventlist = $firebaseArray(eventRef);
			var typeRef = new Firebase(FIREBASE_URL + 'types');
			$scope.getTypes = function(val) {
				var typeQuery = typeRef.orderByChild('name').startAt(val).endAt(val + '~');
				var typelist = $firebaseArray(typeQuery);
				return typelist.$loaded()
					.then(function() {
						return typelist;
					})
					.catch(function(error) {
						console.log("Error:", error);
					});
			};
			$scope.ok = function() {
				if ($scope.eventdate && $scope.eventname && $scope.eventlocation) {
					typeQuery = typeRef.orderByChild('name').startAt($scope.eventname).endAt($scope.eventname);
					var typelist = $firebaseArray(typeQuery);
					typelist.$loaded()
						.then(function() {
							if (typelist.length === 0) {
								typelist.$add({
									name: $scope.eventname
								});
							}
						})
						.catch(function(error) {
							console.log("Error:", error);
						});

					$scope.newEvent();
					$modalInstance.close();
				}
			};
			$scope.cancel = function() {
				$modalInstance.dismiss('cancel');
			};
			$scope.newEvent = function() {
				var correctedTime = $scope.eventdate;
				correctedTime.setHours($scope.eventtime.getHours());
				correctedTime.setMinutes($scope.eventtime.getMinutes());
				var time = correctedTime.getTime();
				$scope.eventlist.$add({
					name: $scope.eventname,
					marker: $scope.marker,
					date: time,
					gender: $scope.authData.facebook.cachedUserProfile.gender,
					author: $scope.authData.uid,
					count: 0
				});
			};
			$scope.today = function() {
				$scope.eventdate = new Date();
			};
			$scope.toggleMin = function() {
				var min = new Date();
				min.setHours(min.getHours() + 1);
				min.setMinutes(0);
				$scope.minDate = ($scope.minDate) ? null : min;
				$scope.eventtime = $scope.minDate;
			};
			$scope.toggleMin();
			$scope.dateOptions = {
				formatMonth: 'MM',
				startingDay: 1
			};
			$scope.open = function($event) {
				$event.preventDefault();
				$event.stopPropagation();
				$scope.opened = true;
			};
			uiGmapGoogleMapApi.then(function(maps) {
				maps.visualRefresh = true;
			});
			$scope.options = {
				scrollwheel: false
			};
			$scope.map = {
				control: {},
				center: {
					latitude: 40.74349,
					longitude: -73.990822
				},
				zoom: 12,
				dragging: true
			};
			$scope.marker = {
				id: 0,
				coords: {
					latitude: 52.47491894326404,
					longitude: -1.8684210293371217
				},
				options: {
					draggable: true
				},
				events: {
					dragend: function(marker, eventName, args) {}
				}
			};

			$scope.searchbox = {
				template: 'searchbox.tpl.html',
				parentdiv: 'searchbox_div',
				events: {
					places_changed: function(searchBox) {
						places = searchBox.getPlaces();
						if (places.length === 0) {
							return;
						}
						var place = places[0];
						$scope.eventlocation = place.name;
						$scope.marker = {
							name: place.name,
							id: 0,
							coords: {
								latitude: place.geometry.location.lat(),
								longitude: place.geometry.location.lng()
							}
						};
						$scope.map = {
							center: {
								latitude: $scope.marker.coords.latitude,
								longitude: $scope.marker.coords.longitude
							},
							zoom: 15
						};
					}
				},
				options: {}
			};
		}
	])
	.controller('ViewEventModalCtrl', ['$scope', '$modalInstance', 'uiGmapGoogleMapApi', 'event',
		function($scope, $modalInstance, uiGmapGoogleMapApi, event) {
			$scope.event = event;
			$scope.ok = function() {
				$modalInstance.close();
			};
			$scope.cancel = function() {
				$modalInstance.dismiss('cancel');
			};
			$scope.marker = event.marker;
			uiGmapGoogleMapApi.then(function(maps) {
				maps.visualRefresh = true;
			});
			$scope.options = {
				scrollwheel: false
			};
			$scope.map = {
				control: {},
				center: {
					latitude: $scope.marker.coords.latitude,
					longitude: $scope.marker.coords.longitude
				},
				zoom: 15,
				dragging: true
			};
		}
	]);