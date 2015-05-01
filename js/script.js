angular.module('fitnessBuddy', ['firebase', 'ui.bootstrap', 'angularMoment', 'uiGmapgoogle-maps','socialLinks'])
	.constant('FIREBASE_URL', 'https://sweltering-heat-7043.firebaseio.com/')
	.factory('Auth', ['$firebaseAuth', 'FIREBASE_URL',
		function($firebaseAuth, FIREBASE_URL) {
			var ref = new Firebase(FIREBASE_URL);
			return $firebaseAuth(ref);
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
	.controller('EventListCtrl', ['$scope', 'FIREBASE_URL', '$firebaseArray', '$modal', 'Auth',
		function($scope, FIREBASE_URL, $firebaseArray, $modal, Auth) {
			$scope.myEvents = [];
			var eventRef = new Firebase(FIREBASE_URL + 'events');
			var query = eventRef.orderByChild('date').limitToLast(25);
			$scope.filteredEvents = $firebaseArray(query);
			$scope.eventlist = $firebaseArray(eventRef);
			// $scope.eventlist.$loaded(function() {
			// 	cull();
			// }, function(error) {
			// 	console.error('Error:', error);
			// });
			$scope.eventlist.$watch(function(event){
				if(event.event == "child_added"){
					cull();
					var record = $scope.eventlist.$getRecord(event.key);
					if ($scope.authData&&$scope.authData.uid == record.author){
						$scope.join(record);
					}	
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
				$scope.auth.$authWithOAuthPopup('facebook').then(function(authData) {
					$scope.authData = authData;
				}).catch(function(error) {
					$scope.auth.$authWithOAuthRedirect('facebook').then(function(authData) {
						$scope.authData = authData;
					}).catch(function(error) {
						console.error('Authentication failed:', error);
					});
				});
			};
			$scope.auth.$onAuth(function(authData) {
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
						$scope.myEventRefs.$add({event:event.$id});
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
						$scope.myEventRefs.$remove($scope.myEventRefs.$indexFor(remove.$id));
					}
				}, function(error) {
					console.error('Error:', error);
				});
			};
			function getMyEvents(){
				if($scope.authData){
					events = [];
					for (var i = 0; i < $scope.myEventRefs.length; i++) {
						var eventId = $scope.myEventRefs[i].event;
						events[events.length] = $scope.eventlist.$getRecord(eventId);
					}
					$scope.myEvents = events;
				}
			}
			function cull(){
				var time = new Date().getTime();
				for (var i = 0; i < $scope.eventlist.length; i++) {
					var event = $scope.eventlist[i];
					if (event.date < time) {
						var item = $scope.eventlist.$getRecord(event.$id);
						$scope.eventlist.$remove(item);
					}
				}
			}
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
					author: $scope.authData.uid
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