
var tntControllers = angular.module("tntControllers", []);


tntControllers.controller("mainController", function ($rootScope, $scope, $routeParams, $http, mangaService) {
  $rootScope.title = "Third New Tokyo City";
  
  $scope.info = "Start Loading Data";
  $http.get(mangaService.base + "manga.json")
    .success(function (data) {
      $scope.mangaList = data;
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
  ["$rootScope", "$scope", "$routeParams", "$location", "$q", "$interval", "mangaService",
  function ($rootScope, $scope, $routeParams, $location, $q, $interval, mangaService) {
    var mangaName = $scope.mangaName = $routeParams.mangaName;
    var volName = $scope.volName = $routeParams.volName;
    
    if (!mangaName || mangaName == "" || !volName || volName == "") {
      return alertify.alert("Invalid Arguments!", function () {
        window.location.href = "#/main";
      });
    }
    
    $(window).off("beforeunload");
    $(window).on("beforeunload", function () {
      $(window).scrollTop(0);
    });
    
    $scope.loading = false;
    $scope.loaded = [];
    $scope.nextVol = false;
    
    function LoadMore () {
      if ($scope.loading) return;
      var windowHeight = $(window).height();
      var documentHeight = $(document).height();
      var scrollTop = $(document).scrollTop();
      
      if (documentHeight - (windowHeight + scrollTop) < 1000 && $scope.current) {
        
        if ($scope.current.number == 0 && $scope.loaded.length > 0) {
          $scope.nextVol = true;
          return;
        }
        
        $scope.loading = true;
        mangaService.GetImage($scope.current.url).then(function (data) {
          
          $rootScope.title = mangaName + " - " + volName;
          $scope.volName = $scope.current.volName;
          $scope.loading = false;
          
          mangaService.ComposeImage(data).then(function (ret) {
            $scope.loaded.push(ret);
          });
          
          $scope.current = $scope.manga.getNext($scope.current.volName, $scope.current.number);
          
          var image = $scope.current;
          for (var i = 0; i < 3; i++) {
            if (image) {
              mangaService.GetImage(image.url);
              image = $scope.manga.getNext(image.volName, image.number);
            }
          }
          
        });
      }
    }
    
    mangaService.GetManga(mangaName).then(function (manga) {
      $scope.manga = manga;
      $scope.current = manga.get(volName, 0); // $scope.current point the next unload image
      LoadMore();
      $interval(function () {
        LoadMore();
      }, 200);
    });
    
    $scope.NextVolumn = function () {
      window.location.href = "#/seriesView/" + $scope.current.mangaName + "/" + $scope.current.volName;
    };
  }
]);


tntControllers.controller("slideViewController",
  ["$rootScope", "$scope", "$routeParams", "$location", "mangaService",
  function ($rootScope, $scope, $routeParams, $location, mangaService) {
      
    var mangaName = $routeParams.mangaName;
    var volName = $routeParams.volName;
    var pageNumber = $routeParams.pageNumber;
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    
    if (!mangaName || mangaName == "" || !volName || volName == "" || !pageNumber || pageNumber == "" || isNaN(parseInt(pageNumber))) {
      return alertify.alert("Invalid Arguments!", function () {
        window.location.href = "#/main";
      });
    }
    
    pageNumber = parseInt(pageNumber) - 1;
    
    var mouseX = 0;
    var mouseY = 0;
    $(document).on("mousemove", function (event) {
      mouseX = event.pageX;
      mouseY = event.pageY;
    });

    var lastMouseDown = null;
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
      var image = $scope.manga.get(volName, pageNumber);
      var url = image.url;
      
      function Display (data) {        
        mangaService.ComposeImage(data).then(function (ret) {
          $(".slideImage").each(function () {
            this.style.backgroundImage = "url('" + ret.src + "')";
            this.style.backgroundRepeat = "no-repeat";
            this.style.backgroundPosition = "center";
            this.style.backgroundSize = "contain";
            this.style.height = ($(window).height() - 51) + "px";
            this.style.marginTop = "51px";
          });
        
          $rootScope.title = mangaName + " - " + image.volName + " - " + image.number + "p";
          $scope.mangaName = mangaName;
          $scope.volName = volName;
          $scope.pageNumber = pageNumber;
        });
      }
    
    
      mangaService.GetImage(url).then(Display);
    };
    
    $(window).off("resize");
    $(window).on("resize", function () {
      $(".slideImage").each(function () {
        this.style.height = ($(window).height() - 51) + "px";
        this.style.marginTop = "51px";
      });
    });
    
    $scope.FirstImage = function () {
      var image = $scope.manga.get(volName, 0);
      if (image) {
        $location.path("/slideView/" + mangaName + "/" + image.volName + "/" + (image.number + 1));
      }
    };
    
    $scope.LastImage = function () {
      var image = $scope.manga.get(volName, $scope.manga.mangaObj[volName].length - 1);
      if (image) {
        $location.path("/slideView/" + mangaName + "/" + image.volName + "/" + (image.number + 1));
      }
    };
    
    $scope.PrevImage = function (n) {
      var image = $scope.manga.get(volName, pageNumber);
      for (var i = 0; i < n; i++) {
        image = $scope.manga.getPrev(image.volName, image.number);
        if (!image) break;
      }
      if (image) {
        $location.path("/slideView/" + mangaName + "/" + image.volName + "/" + (image.number + 1));
      }
    };
    
    $scope.NextImage = function (n) {
      var image = $scope.manga.get(volName, pageNumber);
      for (var i = 0; i < n; i++) {
        image = $scope.manga.getNext(image.volName, image.number);
        if (!image) break;
      }
      if (image) {
        $location.path("/slideView/" + mangaName + "/" + image.volName + "/" + (image.number + 1));
      }
    };
    
    $scope.mouseClick = function () {
      if (lastMouseDown == "left") {
        $scope.NextImage(1);
      } else if (lastMouseDown == "right") {
        $scope.PrevImage(1);
      }
    };
    
    $scope.init = function () {
      mangaService.GetManga(mangaName).then(function (manga) {
        $scope.manga = manga;
        if (!manga.get(volName, pageNumber)) {
          return alertify.alert("Volume Not Found!", function () {
            window.location.href = "#/manga/" + encodeURIComponent(mangaName);
          });
        }
        ShowImage();
        
        // try to next 2 images
        setTimeout(function () {
          var prev = manga.getPrev(volName, pageNumber);
          if (prev) {
            mangaService.GetImage(prev.url);
          }
          var next = manga.getNext(volName, pageNumber);
          if (next) {
            mangaService.GetImage(next.url);
              setTimeout(function () {
              next = manga.getNext(next.volName, next.number);
              if (next) {
                mangaService.GetImage(next.url);
              }
            }, 600);
          }
        }, 400);
      });
    };
  }
]);

