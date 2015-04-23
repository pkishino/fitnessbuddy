var app = angular.module('fitnessBuddy', ['firebase', 'ui.bootstrap', 'angularMoment']);
app.constant('FIREBASE_URL', 'https://sweltering-heat-7043.firebaseio.com/');
app.factory("Auth", ["$firebaseAuth", "FIREBASE_URL",
  function($firebaseAuth, FIREBASE_URL) {
    var ref = new Firebase(FIREBASE_URL);
    return $firebaseAuth(ref);
  }
]);
app.controller('EventListCtrl', ["$scope", "FIREBASE_URL", "$firebaseArray", "$modal", "Auth",
  function($scope, FIREBASE_URL, $firebaseArray, $modal, Auth) {
    var eventRef = new Firebase(FIREBASE_URL + 'event2');
    var query = eventRef.orderByChild("date").limitToLast(25);
    $scope.filteredEvents = $firebaseArray(query);
    $scope.open = function(size) {
      var modalInstance = $modal.open({
        templateUrl: 'myModalContent.html',
        controller: 'NewEventModalCtrl',
        size: size
      });
    };
    $scope.auth = Auth;
    $scope.login = function(){
      $scope.auth.$authWithOAuthPopup("facebook").then(function(authData) {
        console.log("Logged in as:", authData.uid);
        $scope.authData = authData;
        }).catch(function(error) {
          $scope.auth.$authWithOAuthRedirect("facebook").then(function(authData) {
            console.log("Logged in as:", authData.uid);
            $scope.authData = authData;
            }).catch(function(error) {
              console.error("Authentication failed:", error);
            });
      });
    }
    $scope.auth.$onAuth(function(authData) {
      if(authData){
        var ownedRef = new Firebase(FIREBASE_URL + 'users/'+authData.uid);
        $scope.ownedEvents = $firebaseArray(ownedRef);
        ownQuery = ownedRef.orderByChild("date");
        $scope.orderedOwnedEvents = $firebaseArray(ownQuery);
      }
    });
    $scope.subscribe = function(event){
      $scope.ownedEvents.$add(event);
    };
    $scope.remove = function(id){
      $scope.ownedEvents.$remove($scope.ownedEvents.$getRecord(id))
    }
  }
]);
app.controller('NewEventModalCtrl', ["$scope", "FIREBASE_URL", "$firebaseArray", "$modalInstance",
  function($scope, FIREBASE_URL, $firebaseArray, $modalInstance) {
    var eventRef = new Firebase(FIREBASE_URL + 'event2');
    $scope.eventlist = $firebaseArray(eventRef);
    $scope.ok = function() {
      $modalInstance.close();
    };
    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
    $scope.newEvent = function() {
      var corrected_time = $scope.eventdate;
      corrected_time.setHours($scope.eventtime.getHours());
      corrected_time.setMinutes($scope.eventtime.getMinutes());
      $scope.eventlist.$add({
        name: $scope.eventname,
        text: $scope.eventdesc,
        date: corrected_time.getTime()
      });
      $scope.eventname = '';
      $scope.eventdesc = '';
      $scope.eventdate = '';
    };
    $scope.today = function() {
      $scope.eventdate = new Date();
    };
    $scope.toggleMin = function() {
      var min = new Date();
      min.setHours(min.getHours() + 1);
      min.setMinutes(0)
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
  }
]);