angular.module('fitnessBuddy', ['firebase', 'ui.bootstrap', 'angularMoment', 'uiGmapgoogle-maps'])
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
.controller('EventListCtrl', ['$scope', 'FIREBASE_URL', '$firebaseArray', '$modal', 'Auth',
  function($scope, FIREBASE_URL, $firebaseArray, $modal, Auth) {
    var eventRef = new Firebase(FIREBASE_URL + 'events');
    $scope.eventlist = $firebaseArray(eventRef);
    $scope.eventlist.$loaded(function() {
      var time = new Date().getTime();
      var i;
      var event;
      for (i = 0, event = $scope.eventlist[i]; i<$scope.eventlist.length; i++) {
        if (event.date < time){
          var item = $scope.eventlist.$getRecord(event.$id);
          $scope.eventlist.$remove(item);
        }
      }
    }, function(error) {
      console.error('Error:', error);
    });

    var query = eventRef.orderByChild('date').limitToLast(25);
    $scope.filteredEvents = $firebaseArray(query);
    $scope.open = function(size) {
      var modalInstance = $modal.open({
        templateUrl: 'myModalContent.html',
        controller: 'NewEventModalCtrl',
        size: size
      });
    };
    $scope.auth = Auth;
    $scope.login = function() {
      $scope.auth.$authWithOAuthPopup('facebook').then(function(authData) {
        console.log('Logged in as:', authData.uid);
        $scope.authData = authData;
      }).catch(function(error) {
        $scope.auth.$authWithOAuthRedirect('facebook').then(function(authData) {
          console.log('Logged in as:', authData.uid);
          $scope.authData = authData;
        }).catch(function(error) {
          console.error('Authentication failed:', error);
        });
      });
    };
    $scope.auth.$onAuth(function(authData) {
      if (authData) {
        var ownedRef = new Firebase(FIREBASE_URL + 'users/' + authData.uid);
        $scope.ownedEvents = $firebaseArray(ownedRef);
        var ownQuery = ownedRef.orderByChild('date');
        $scope.orderedOwnedEvents = $firebaseArray(ownQuery);
      }
    });
    $scope.join = function(event) {
      $scope.ownedEvents.$add(event);
    };
    $scope.remove = function(id) {
      $scope.ownedEvents.$remove($scope.ownedEvents.$getRecord(id));
    };
  }
])
.controller('NewEventModalCtrl', ['$scope', 'FIREBASE_URL', '$firebaseArray', '$modalInstance', 'uiGmapGoogleMapApi',
  function($scope, FIREBASE_URL, $firebaseArray, $modalInstance, uiGmapGoogleMapApi) {
    var eventRef = new Firebase(FIREBASE_URL + 'events');
    $scope.eventlist = $firebaseArray(eventRef);
    $scope.ok = function() {
      $scope.newEvent();
      $modalInstance.close();
    };
    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
    $scope.newEvent = function() {
      var correctedTime = $scope.eventdate;
      correctedTime.setHours($scope.eventtime.getHours());
      correctedTime.setMinutes($scope.eventtime.getMinutes());
      var time=correctedTime.getTime()
      $scope.eventlist.$add({
        name: $scope.eventname,
        text: $scope.eventlocation,
        date: time
      });
      $scope.eventname = '';
      $scope.eventlocation = '';
      $scope.eventdate = '';
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
      $scope.map = {
        center: {
          latitude: 45,
          longitude: -73
        },
        zoom: 8
      };
    });
    $scope.options = {
      scrollwheel: false
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
          // For each place, get the icon, place name, and location.
          newMarkers = [];
          var bounds = new google.maps.LatLngBounds();
          var i;
          var place;
          for (i = 0, place = places[i]; i<places.length; i++) {
            // Create a marker for each place.
            var marker = {
              id:place.id,
              place_id: place.place_id,
              name: place.name,
              latitude: place.geometry.location.lat(),
              longitude: place.geometry.location.lng(),
              options: {
                visible:false
              }
            };
            $scope.eventlocation = place.name;
            newMarkers.push(marker);

            bounds.extend(place.geometry.location);
          }
        }
      },
      options: {}
    };
  }
]);