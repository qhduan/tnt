
var tntControllers = angular.module("tntControllers", []);


tntControllers.controller("mainController",
  ["$rootScope", "$scope", "$routeParams", "mangaService",
  function ($rootScope, $scope, $routeParams, mangaService) {
    $rootScope.title = "Third New Tokyo City";
    
    $scope.info = "Start Loading Data";
    
    mangaService.GetMangaList().then(function (data) {
      $scope.mangaList = data;
      $scope.mangaList.forEach(function (elem, i, a) {
        a[i].logo = MangaBase + elem.name + "/logo.jpg";
      });
      $scope.info = "Loaded " + data.length + " Manga";
    }, function (err) {
      $scope.info = "Loading Error";
      alertify.alert("GetMangaList error, " + err);
    });
  }
]);


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
    }, function (err) {
      alertify.alert(err, function () {
        window.location.href = "#/main";
      });
    });
  }
]);



tntControllers.controller("seriesViewController",
  ["$rootScope", "$scope", "$routeParams", "$location", "$timeout", "mangaService",
  function ($rootScope, $scope, $routeParams, $location, $timeout, mangaService) {
    $(window).on("beforeunload", function () {
      $(window).scrollTop(0);
    });
    
    $scope.loading = false;
    $scope.loaded = [];
    
    function LoadMore () {
      if (!$location.url().match(/seriesView/)) return;
      
      var documentHeight = $(document).height();
      var windowHeight = $(window).height();
      var scrollTop = $(document).scrollTop();
      
      if (documentHeight - (windowHeight + scrollTop) < 200 && $scope.current) {
        $scope.loading = true;
        
        mangaService.GetImage($scope.current.url).then(function (data) {
          $scope.loading = false;
          if (!$location.url().match(/seriesView/)) return;
          
          var image = $scope.current;
          
          $scope.volName = image.volName;
          $rootScope.title = image.mangaName + " - " + image.volName + " - " + (image.number + 1);          
          $location.url("/seriesView/" + image.mangaName + "?volume=" + image.volName + "&page=" + (image.number + 1));
          $scope.last = image;
          
          $scope.current = $scope.manga.getNext(image.volName, image.number);
          
          // try load next 3
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
          
          $(".seriesImage").each(function () {
            this.appendChild(data.src);
            
            var margin = document.createElement("div")
            margin.style.height = "20px";
            this.appendChild(margin);
          });
          
          $timeout(function () {
            LoadMore();
          }, 50);
        });
      } else {
        $timeout(function () {
          LoadMore();
        }, 50);
      }
    }
    
    $scope.Click = function () {
      var s = $(window).scrollTop();
      $(window).scrollTop(s + $(window).height() / 2);
    };
    
    $scope.init = function () {
      $scope.mangaName = $routeParams.mangaName;
      $scope.volName = $routeParams.volume;
      
      if (!$scope.mangaName || $scope.mangaName == "") {
        return alertify.alert("Invalid Manga Name!", function () {
          window.location.href = "#/main";
        });
      }
      
      mangaService.GetManga($scope.mangaName).then(function (manga) {
        $scope.manga = manga;
        if (!$scope.volName) $scope.volName = manga.volume[0];
        
        $scope.current = manga.get($scope.volName, 0); // $scope.current point the next unload image
        
        if (!$scope.current) {
          return alertify.alert("Invalid Volume Name!", function () {
            window.location.href = "#/main";
          });
        }
        
        LoadMore();
      });
    }
    
  }
]);



tntControllers.controller("slideViewController",
  ["$rootScope", "$scope", "$routeParams", "$location", "$document", "mangaService",
  function ($rootScope, $scope, $routeParams, $location, $document, mangaService) {
    
    function ResizeImageContainer () {
      var element = $(".slideImage");
      var win_width = $(window).width();
      var win_height = $(window).height();
      element.css("height", (win_height - 51) + "px");
      element.css("width", win_width + "px");
      element.css("max-height", (win_height - 51) + "px");
      element.css("max-width", win_width + "px");
      element.css("margin-top", "51px");
    }
    
    function ShowImage () {
      var volName = $location.search().volume;
      var pageNumber = parseInt($location.search().page);
      
      if (isNaN(pageNumber)) pageNumber = 1;
      
      if (!volName) {
        return alertify.alert("Invalid Arguments!", function () {
          window.location.href = "#/main";
        });
      }
      
      var image = $scope.manga.get(volName, pageNumber - 1);
    
      mangaService.GetImage(image.url).then(function (data) {
        $scope.loading = false;
        if (!$location.url().match(/slideView/)) return;
        
        $(".slideImage").each(function () {
          while(this.firstChild) {
            this.removeChild(this.firstChild);
          }
        });
        
        ResizeImageContainer(this);
        
        $(".slideImage").each(function () {
          this.appendChild(data.src);
          data.src.style.maxWidth = "100%";
          data.src.style.maxHeight = "100%";
        });
      
        $scope.mangaName = image.mangaName;
        $scope.volName = image.volName;
        $scope.pageNumber = image.number;
        $rootScope.title = image.mangaName + " - " + image.volName + " - " + (image.number + 1) + "p";
        
        // try load next 3
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
      });
    };
    
    $scope.onResize = function () {
      ResizeImageContainer();
    };
    
    $scope.PrevVolume = function () {
      var image = $scope.manga.getPrev($scope.volName, 0);
      if (image) {
        $location.url("/slideView/" + image.mangaName + "?volume=" + image.volName + "&page=" + (image.number + 1));
      }
    };
    
    $scope.NextVolume = function () {
      var image = $scope.manga.getNext($scope.volName, $scope.manga.mangaObj[$scope.volName].length - 1);
      if (image) {
        $location.url("/slideView/" + image.mangaName + "?volume=" + image.volName + "&page=" + (image.number + 1));
      }
    };
    
    $scope.GoImage = function (n) {
      if ($scope.loading) return;
      var image = $scope.manga.get($scope.volName, $scope.pageNumber);
      for (var i = 0; i < Math.abs(n); i++) {
        if (n > 0) {
          image = $scope.manga.getNext(image.volName, image.number);
        } else {
          image = $scope.manga.getPrev(image.volName, image.number);
        }
        if (!image) break;
      }
      if (image) {
        $location.url("/slideView/" + image.mangaName + "?volume=" + image.volName + "&page=" + (image.number + 1));
      }
    };
    
    $scope.onMousewheel = function (event) {
      var event = window.event || event; // old IE support
      var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
      if (delta == -1) { // down
        $scope.GoImage(1);
      } else { // up
        $scope.GoImage(-1);
      }
    };
    
    $scope.onKeypress = function (event) {
      var k = event.which || event.keyCode;
      
      if (k == 37 || k == 38 || k == 33) { //left, up, pageup
        $scope.GoImage(-1);
      } else if (k == 39 || k == 40 || k == 34 ) { // right, down, pagedown
        $scope.GoImage(1);
      }
    };
    
    $scope.MouseClick = function (event) {
      if (event.which == 3) { // right click
        $scope.GoImage(-1);
      } else if (event.which == 1) { // left click
        //$scope.GoImage(-1);
      }
    };
    
    $scope.$on("$routeUpdate", function () {
      $scope.loading = true;
      ShowImage();
    });
    
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
        var volName = $routeParams.volume;
        var pageNumber = parseInt($routeParams.page);
        
        if (!volName) volName = manga.volume[0]; // get first volume name of manga
        if (isNaN(pageNumber)) pageNumber = 1;
        
        $location.url("/slideView/" + $scope.mangaName + "?volume=" + volName + "&page=" + pageNumber);
        ShowImage();
      });
    };
  }
]);

