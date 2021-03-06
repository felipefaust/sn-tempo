'use strict'
app.controller('mainController', ['$scope', '$rootScope', 'cities', 'weatherApi', 'blMocks', 'favoriteManager',
function($scope, $rootScope, cities, weatherApi, blMocks, favoriteManager) {
  var missingState = "Selecione corretamente um estado e uma cidade.";
  $scope.states = cities.estados;
  $scope.waiting = false;
  var favoriteErr = false;

   $rootScope.$on('favorite', function(event, data) {
     if(data) {
       $scope.hasFavorite = true;
       $scope.favoriteCity = data.city;
       $scope.favoriteState = data.state;
     } else {
       $scope.favoritecity = null;
       $scope.favoriteState = null;
       $scope.cbFavorite = false;
       $scope.hasFavorite = false;
     }
   });

  /* Search for the day with maximum and minimum temperature*/
  var maxAndMin = function() {
    var max = {temperatura_max: null};
    var min = {temperatura_min: 100};
    $scope.weatherInfo.list.forEach(function(pr) {
      var data = new Date(pr.dt * 1000);
      if (pr.temp.max > max.temperatura_max) {
        max.temperatura_max = pr.temp.max;
        max.data = data;
      }
      if (pr.temp.min < min.temperatura_min) {
        min.temperatura_min = pr.temp.min;
        min.data = data;
      }
    });
    $scope.maxima = max;
    $scope.minima = min;
  }
  /* Verifies if the next sunday will be appropriate for a beach ride */
  var recommendation = function() {
    $scope.recommend = false;
    $scope.weatherInfo.list.some(function(pr) {
      var data = new Date(pr.dt * 1000);
      if (data.toString().split(" ")[0].indexOf("Sun") > -1) {
        $scope.sunday = {
          temperatura_max: pr.temp.max,
          descricao: pr.weather[0].description,
          data: data
        }
        if ((pr.weather[0].description.indexOf("céu claro") > -1 && (pr.temp.max > 25))) {
          $scope.recommend = true;
        }
        return true;
      }
    });
  }
  /* Set values and data to config char */
  var chartConfig = function() {
    var labels = [];
    var min = [];
    var max = [];
    $scope.series = ['Máxima', 'Mínima'];
    $scope.weatherInfo.list.forEach(function(pr) {
      var data = new Date(pr.dt * 1000);
      labels.push(data.toString().split(" ")[0]); //Show days name as labels
      // labels.push(pr.data.split(" - ")[1]); //Show days (dd/mm/yyyy) as labels.
      min.push(pr.temp.min);
      max.push(pr.temp.max);
    });
    $scope.labels = labels;
    $scope.data = [max, min];
  }
  /* Function called by ng-click to consult and show weather for a specific city */
  $scope.showWeather = function(){
    $scope.weatherInfo = false; //Removes any existing weather info.
    $scope.messageErr = false; //Removes any existing error message.
    /* If there is no state or city selected show the error message and do not search */
    if(!$scope.state || !$scope.cityName) {
        $scope.messageErr = missingState;
        return;
    }
    $scope.waiting = true; //Set waiting for the spinner loader shows up.
    weatherApi.consult($scope.cityName, $scope.state.sigla)
    .then(function(result) {
      var arr = [];
      result.data.list.forEach(function(e){
        var dt = new Date(e.dt * 1000);
        arr.push({
          data: dt,
          descricao: e.weather[0].description,
          imagem: e.weather[0].icon,
          temperatura_min: e.temp.min,
          temperatura_max: e.temp.max
        });
      });
      result.data.previsoes = arr;
      $scope.weatherInfo = result.data;
      $scope.waiting = false;
      maxAndMin();
      recommendation();
      chartConfig();
      if($scope.cbFavorite) //If is the favorite city, save the data into cache
        favoriteManager.setData(result.data);
    },
    function(err) {
        $scope.messageErr = "Não foi possível obter as informações de tempo para a cidade desejada."
        $scope.waiting = false;
    });
  }
  /* Set the favorite state and city */
  var loadFavorite = function(favorite) {
    //Load the favorite city from service
    var favorite = favoriteManager.getFavorite();
    $scope.states.some(function(st) {
      if (st.sigla.indexOf(favorite.state) > -1) {
        $scope.state = st;
        return true;
      }
    });
    $scope.state.cidades.some(function(ct) {
      if(ct.indexOf($scope.favoriteCity) > -1) {
        $scope.cityName = ct;
        $scope.cbFavorite = true;
        return true;
      }
    });
    $scope.showWeather(); //Load favorite weather info
  }
  //First load of the page
  loadFavorite();

  /* Remos the favorite place */
  $scope.removeFavorite = function() {
    favoriteManager.removeFavorite();
  }
  /* Save the new favorite into the localStorage */
  $scope.setFavorite = function() {
    $scope.messageErr = false; //Removes any existing error message.
    if(!$scope.cbFavorite)
      return;
    if (!$scope.cityName || !$scope.state) {
      favoriteErr = true;
      $scope.messageErr = missingState;
      return;
    }
    favoriteManager.setFavorite({city: $scope.cityName, state: $scope.state.sigla});
  }

  /* Closes the error message */
  $scope.closeErr = function() {
    //If the error is after a failed favorite try, the checkbox must be set to unchecked.
    if (favoriteErr) {
      $scope.cbFavorite = false;
      favoriteErr = false;
    }
    $scope.messageErr = false;
  }
}]);
