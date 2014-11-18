
var tntControllers = angular.module("tntControllers", []);


tntControllers.controller("mainController", function ($rootScope, $scope, $routeParams, $http, mangaService) {
  $rootScope.title = "Third New Tokyo City";
  
  $scope.info = "Start Loading Data";
  $http.get(mangaService.base + "manga.json")
    .success(function (data) {
      $scope.mangaList = data;
      $scope.mangaList.forEach(function (elem, i, a) {
        a[i].logo = MangaBase + elem.name + "/logo.png";
      });
      $scope.info = "Loaded " + data.length + " Manga";
    }).
    error(function () {
      $scope.info = "Loading Error";
    });
});


tntControllers.controller("mangaController",
  ["$rootScope", "$scope", "$routeParams", "$http", "mangaService",
  function ($rootScope, $scope, $routeParams, $http, mangaService) {
    var mangaName = $routeParams.mangaName;
    
    if (!mangaName || mangaName == "") {
      return alertify.alert("Invalid Arguments!", function () {
        window.location.href = "#/main";
      });
    }
    
    $rootScope.title = mangaName + " - Manga List";
    $scope.mangaName = mangaName;
    
    mangaService.GetManga(mangaName).then(function (manga) {
      $scope.volTable = [];
      
      $scope.manga = manga;
      
      Object.keys(manga.mangaObj).forEach(function (volName) {
        $scope.volTable.push({
          name: volName,
          count: manga.mangaObj[volName].length
        });
      });
    
      $http.get(mangaService.base + mangaName + "/description.txt")
        .success(function (data) {
          $scope.description = data;
        });
    }, function (err) {
      alertify.alert(err, function () {
        window.location.href = "#/main";
      });
    });
  }
]);




tntControllers.controller("seriesViewController",
  ["$rootScope", "$scope", "$routeParams", "$location", "$q", "$timeout", "mangaService",
  function ($rootScope, $scope, $routeParams, $location, $q, $timeout, mangaService) {    
    $(window).off("beforeunload");
    $(window).on("beforeunload", function () {
      $(window).scrollTop(0);
    });
    
    $scope.loading = false;
    $scope.loaded = [];
    
    function LoadMore () {
      if ($scope.loading) return;
      if (!$location.url().match(/\/seriesView\//)) return;
      
      var windowHeight = $(window).height();
      var documentHeight = $(document).height();
      var scrollTop = $(document).scrollTop();
      
      if (documentHeight - (windowHeight + scrollTop) < 2000 && $scope.current) {
        
        if (documentHeight - (windowHeight + scrollTop) < 100) {
          $scope.loading = true;
        }
        
        mangaService.GetImage($scope.current.url).then(function (data) {
          $scope.loading = false;
          $scope.volName = $scope.current.volName;
          $rootScope.title = $scope.mangaName + " - " + $scope.volName;
          $location.url("/seriesView/" + $scope.mangaName + "?volume=" + $scope.volName);
          
          $scope.loaded.push(data);
          $scope.current = $scope.manga.getNext($scope.current.volName, $scope.current.number);
          
          $timeout(function () {
            LoadMore();
          }, 300);
        });
      } else {
        $timeout(function () {
          LoadMore();
        }, 300);
      }
    }
    
    $scope.init = function () {
      $scope.mangaName = $routeParams.mangaName;
      $scope.volName = $routeParams.volume;
      
      if (!$scope.mangaName || $scope.mangaName == "") {
        return alertify.alert("Invalid Manga Name!", function () {
          $location.url("/main");
        });
      }
      
      mangaService.GetManga($scope.mangaName).then(function (manga) {
        $scope.manga = manga;
        if (!$scope.volName) $scope.volName = manga.volume[0];
        
        $scope.current = manga.get($scope.volName, 0); // $scope.current point the next unload image
        
        if (!$scope.current) {
          return alertify.alert("Invalid Volume Name!", function () {
            $location.url("/main");
          });
        }
        
        LoadMore();
      });
    }
    
  }
]);



tntControllers.controller("slideViewController",
  ["$rootScope", "$scope", "$routeParams", "$location", "mangaService",
  function ($rootScope, $scope, $routeParams, $location, mangaService) {
    
    var lastMouseDown = null;
    $(document).off("mousedown");
    $(document).on("mousedown", function (event) {
      event.preventDefault();
      switch (event.which) {
        case 1:
          lastMouseDown = "left";
          break;
        case 2:
          lastMouseDown = "middle";
          break;
        case 3:
          lastMouseDown = "right";
          break;
        default:
          lastMouseDown = null;
      }
    });
    
    function ShowImage () {
      $scope.loading = true;
      var image = $scope.manga.get($scope.volName, $scope.pageNumber);
      
      function Display (data) {
        $(".slideImage").each(function () {
          this.style.backgroundImage = "url('" + data.src + "')";
          this.style.backgroundRepeat = "no-repeat";
          this.style.backgroundPosition = "center";
          this.style.backgroundSize = "contain";
          this.style.height = ($(window).height() - 51) + "px";
          this.style.marginTop = "51px";
        });
      
        $scope.mangaName = image.mangaName;
        $scope.volName = image.volName;
        $scope.pageNumber = image.number;
        $rootScope.title = image.mangaName + " - " + image.volName + " - " + (image.number + 1) + "p";
        $location.url("/slideView/" + image.mangaName + "?volume=" + image.volName + "&page=" + (image.number + 1));
        $scope.loading = false;
        
        // try next 3 images
        var next = $scope.manga.getNext(image.volName, image.number);
        if (next) {
          mangaService.GetImage(next.url).then(function () {
            next = $scope.manga.getNext(next.volName, next.number);
            if (next) {
              mangaService.GetImage(next.url).then(function () {
                next = $scope.manga.getNext(next.volName, next.number);
                if (next) {
                  mangaService.GetImage(next.url);
                }
              });
            }
          });
        }
      }
    
      mangaService.GetImage(image.url).then(Display);
    };
    
    $(window).off("resize");
    $(window).on("resize", function () {
      $(".slideImage").each(function () {
        this.style.height = ($(window).height() - 51) + "px";
        this.style.marginTop = "51px";
      });
    });
    
    $scope.PrevVolume = function () {
      var image = $scope.manga.getPrev($scope.volName, 0);
      if (image) {
        image = $scope.manga.get(image.volName, 0);
        $scope.volName = image.volName;
        $scope.pageNumber = image.number;
        ShowImage();
      }
    };
    
    $scope.NextVolume = function () {
      var image = $scope.manga.getNext($scope.volName, $scope.manga.mangaObj[$scope.volName].length - 1);
      if (image) {
        image = $scope.manga.get(image.volName, 0);
        $scope.volName = image.volName;
        $scope.pageNumber = image.number;
        ShowImage();
      }
    };
    
    $scope.PrevImage = function (n) {
      var image = $scope.manga.get($scope.volName, $scope.pageNumber);
      for (var i = 0; i < n; i++) {
        image = $scope.manga.getPrev(image.volName, image.number);
        if (!image) break;
      }
      if (image) {
        $scope.volName = image.volName;
        $scope.pageNumber = image.number;
        ShowImage();
      }
    };
    
    $scope.NextImage = function (n) {
      var image = $scope.manga.get($scope.volName, $scope.pageNumber);
      for (var i = 0; i < n; i++) {
        image = $scope.manga.getNext(image.volName, image.number);
        if (!image) break;
      }
      if (image) {
        $scope.volName = image.volName;
        $scope.pageNumber = image.number;
        ShowImage();
      }
    };
    
    $scope.mouseClick = function () {
      if (lastMouseDown == "left") {
        $scope.NextImage(1);
      } else if (lastMouseDown == "right") {
        $scope.PrevImage(1);
      }
    };
    
    $scope.loading = true;
    $scope.init = function () {
      $scope.mangaName = $routeParams.mangaName;
      if (!$scope.mangaName || $scope.mangaName == "") {
        return alertify.alert("Invalid Manga Name!", function () {
            window.location.href = "#/main";
        });
      }
      
      mangaService.GetManga($scope.mangaName).then(function (manga) {
        $scope.manga = manga;
        $scope.volName = $routeParams.volume;
        $scope.pageNumber = parseInt($routeParams.page);
        
        if (!$scope.volName) $scope.volName = manga.volume[0]; // get first volume name of manga
        if (isNaN($scope.pageNumber)) $scope.pageNumber = 1;
        
        $scope.pageNumber--;
        
        if (!manga.get($scope.volName, $scope.pageNumber)) {
          return alertify.alert("Volume Not Found!", function () {
            window.location.href = "#/manga/" + $scope.mangaName;
          });
        }
        
        ShowImage();
      });
    };
  }
]);

