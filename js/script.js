var app=angular.module('fitnessBuddy',['firebase','ui.bootstrap','angularMoment']);
app.constant('FIREBASE_URL','https://sweltering-heat-7043.firebaseio.com/event2');
app.controller('EventListCtrl',["$scope", "FIREBASE_URL","$firebaseArray","$modal",
    function($scope, FIREBASE_URL, $firebaseArray,$modal){
    var eventRef = new Firebase(FIREBASE_URL);
    //create a query for the most recent 25 messages on the server
    var query = eventRef.orderByChild("date").limitToLast(25);
    //the $firebaseArray service properly handles Firebase queries as well
    $scope.filteredEvents = $firebaseArray(query);
    $scope.open = function (size) {
    var modalInstance = $modal.open({
      templateUrl: 'myModalContent.html',
      controller: 'NewEventModalCtrl',
      size: size
    });
    };
}]);
app.controller('NewEventModalCtrl',["$scope", "FIREBASE_URL", "$firebaseArray","$modalInstance",
 function($scope, FIREBASE_URL, $firebaseArray,$modalInstance){
  var eventRef = new Firebase(FIREBASE_URL);
  $scope.eventlist=$firebaseArray(eventRef);
  $scope.ok = function () {
    $modalInstance.close();
  };
  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
  $scope.newEvent= function(){
      var corrected_time=$scope.eventdate;
      corrected_time.setHours($scope.eventtime.getHours());
      corrected_time.setMinutes($scope.eventtime.getMinutes());
        $scope.eventlist.$add({
            name: $scope.eventname,
            text: $scope.eventdesc,
            date: corrected_time.getTime()
        });
        $scope.eventname='';
        $scope.eventdesc='';
        $scope.eventdate='';
    };
    $scope.today = function() {
      $scope.eventdate = new Date();
    };
    $scope.toggleMin = function() {
      var min=new Date();
      min.setHours(min.getHours()+1);
      min.setMinutes(0)
      $scope.minDate = ( $scope.minDate ) ? null : min;
      $scope.eventtime = $scope.minDate;
    };
    $scope.toggleMin();
    $scope.dateOptions = {
      formatMonth:'MM',
      startingDay: 1
    };
    $scope.open = function($event) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope.opened = true;
    };
}]);
      
