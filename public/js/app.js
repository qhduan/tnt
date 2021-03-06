
var tntApp = angular.module("tntApp", ["ngRoute", "ngTouch", "tntControllers"]);

  
//var MangaBase = "/";
var MangaBase = "http://manga-cache.oss-cn-hangzhou.aliyuncs.com/";

tntApp.config(["$routeProvider", function ($routeProvider) {
  $routeProvider.
    when("/main", {
      templateUrl: "template/main.html",
      controller: "mainController"
    }).
    when("/manga/:mangaName", {
      templateUrl: "template/manga.html",
      controller: "mangaController"
    }).
    when("/slideView/:mangaName", {
      reloadOnSearch: false,
      templateUrl: "template/slideView.html",
      controller: "slideViewController"
    }).
    when("/seriesView/:mangaName", {
      reloadOnSearch: false,
      templateUrl: "template/seriesView.html",
      controller: "seriesViewController"
    }).
    otherwise({
      redirectTo: "/main"
    });
}]);

tntApp.run(function ($rootScope, $location) {
  var history = [];
  
  $rootScope.$on("$routeChangeSuccess", function () {
    history.push($location.url());
  });
  
  $rootScope.goBack = function () {
    var url = "/main";
    if (history.length > 1) url = history.splice(-2)[0];
    window.location.href = "#" + url;
  };
  
  $rootScope.encodeURIComponent = encodeURIComponent;
});

tntApp.run(['$route', '$rootScope', '$location', function ($route, $rootScope, $location) {
  var original = $location.path;
  $location.path = function (path, reload) {
    if (reload === false) {
      var lastRoute = $route.current;
      var un = $rootScope.$on('$locationChangeSuccess', function () {
        $route.current = lastRoute;
        un();
      });
    }
    return original.apply($location, [path]);
  };
  
  $rootScope.$on("$routeChangeStart", function () {
    $rootScope.LoadingScreen = true;
  });
  
  $rootScope.$on("$routeChangeSuccess", function () {
    $rootScope.LoadingScreen = false;
  });
  
  $rootScope.$on("$routeChangeError", function () {
    $rootScope.LoadingScreen = false;
  });
  
}])


function Manga (mangaName, mangaObj) {
  var self = this;
  
  self.mangaName = mangaName;
  self.mangaObj = mangaObj;
  self.volume = Object.keys(mangaObj);
  self.list = {};
  self.logo = MangaBase + mangaName + "/logo.jpg";
  
  self.volume.forEach(function (volName) {
    mangaObj[volName].forEach(function (imageName, i) {
      var key = mangaName + "-" + volName + "-" + i;
      self.list[key] = {
        mangaName: mangaName,
        volName: volName,
        imageName: imageName,
        number: i,
        url: MangaBase + window.encodeURIComponent(mangaName)
          + "/" + window.encodeURIComponent(volName)
          + "/" + window.encodeURIComponent(imageName)
      };
    });
  });
  self.index = Object.keys(self.list);
}

Manga.prototype.get = function (volName, number) {
  var self = this;
  return self.list[self.mangaName + "-" + volName + "-" + number];
};

Manga.prototype.getNext = function (volName, number) {
  var self = this;
  var key = self.mangaName + "-" + volName + "-" + number;
  if (self.list[key]) {
    var pos = self.index.indexOf(key);
    var nextKey = self.index[pos + 1];
    return self.list[nextKey];
  }
};

Manga.prototype.getPrev = function (volName, number) {
  var self = this;
  var key = self.mangaName + "-" + volName + "-" + number;
  if (self.list[key]) {
    var pos = self.index.indexOf(key);
    var prevKey = self.index[pos - 1]
    return self.list[prevKey];
  }
};


tntApp.factory("mangaService", function ($rootScope, $http, $q) {
  var imageCache = {};
  var mangaCache = {};
  var mangaListCache = {};
  
  function GetMangaList () {
    var deferred = $q.defer();
    $.ajax({
      type: "GET",
      url: MangaBase + "/manga.json",
      dataType: "json"
    })
      .done(function (data) {
        deferred.resolve(data);
      })
      .fail(function (jqXHR, textStatus) {
        for (var i in jqXHR) {
          console.log(i, jqXHR[i]);
        }
        console.log(jqXHR, textStatus);
        deferred.reject("GetManga $.get error, " + textStatus);
      });
    return deferred.promise;
  }
  
  function GetManga (mangaName) {
    var deferred = $q.defer();
    
    if (mangaCache[mangaName]) {
      deferred.resolve(mangaCache[mangaName]);
    } else {
      $.ajax({
        type: "GET",
        url: MangaBase + window.encodeURIComponent(mangaName) + "/manga.json",
        dataType: "json"
      })
        .done(function (data) {
          var m = new Manga(mangaName, data);
          mangaCache[mangaName] = m;
          deferred.resolve(mangaCache[mangaName]);
        })
        .fail(function (jqXHR, textStatus) {
          console.log(jqXHR, textStatus);
          deferred.reject("GetManga $.get error, " + textStatus);
        });
    }
    return deferred.promise;
  }
  
  var ImageGettingList = {}; // { url: [listener1, listener2, ...] }
  
  function GetImage (url) {
    var deferred = $q.defer();
    
    if (imageCache[url]) {
      deferred.resolve(imageCache[url]);
    } else {
      if (ImageGettingList[url]) { // the image is getting by other thread
        ImageGettingList[url].push(function () {
          deferred.resolve(imageCache[url]);
        });
      } else {
        ImageGettingList[url] = [];
        var imageObj = document.createElement("img");
        
        function ImageOnload () {          
          imageCache[url] = {
            src: imageObj,
            width: imageObj.width,
            height: imageObj.height,
            ratio: imageObj.width / imageObj.height
          };
          
          if (ImageGettingList[url].length) {
             for (var i = 0; i < ImageGettingList[url].length; i++) {
                ImageGettingList[url][i]();
             }
          }
          
          delete  ImageGettingList[url];
        };
        
        var now = new Date().getTime();
        imageObj.onload = ImageOnload;
        imageObj.src = url + "?t=" + now + "#" + now;
        
        var reloadPoint = [5*1000, 10*1000, 20*1000, 35*1000, 55*1000];
        
        var start = 100;
        var int = setInterval(function () {
          start += 100;
          if (imageCache[url]) {
            clearInterval(int);
            deferred.resolve(imageCache[url]);
          } else {
            if (start >= 60*1000) { // 60s
              clearInterval(int);
            } else if (reloadPoint.indexOf(start) != -1) { // retry per 5s
              var now = new Date().getTime();
              imageObj.onload = function () {}; // set old imageObj to nothing
              
              imageObj = document.createElement("img"); // create new
              imageObj.onload = ImageOnload;
              imageObj.src = url + "?t=" + now + "#" + now;
            }
          }
        }, 100);
      }
    }
    return deferred.promise;
  }
  
  return {
    GetMangaList: GetMangaList,
    GetImage: GetImage,
    GetManga: GetManga
  };
});

tntApp.directive("ngResize", ["$parse", function ($parse) {
  return function (scope, element, attr) {
    var handler = $parse(attr["ngResize"]);
    $(window).on("resize", function(event) {
      handler(scope, {"$event": event});
      scope.$apply();
    });
  };
}]);



tntApp.directive("ngMousewheel", ["$parse", function ($parse) {
  return function (scope, element, attr) {
    var handler = $parse(attr["ngMousewheel"]);
    function handle (event) {
      handler(scope, {"$event": event});
      scope.$apply();
    }
    element.each(function () {
      if (this.addEventListener) {
        this.addEventListener("mousewheel", handle, false);
        this.addEventListener("DOMMouseScroll", handle, false);
      } else {
        this.attachEvent("onmousewheel", handle);
      }
    });
  };
}]);

tntApp.directive("ngKeypress", ["$parse", function($parse) {
  return function (scope, element, attr){
    var handler = $parse(attr["ngKeypress"]);
    $(document).on("keypress", function(event) {
      handler(scope, {"$event": event});
      scope.$apply();
    });
  };
}]);
