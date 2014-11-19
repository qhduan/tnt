
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
}])


function Manga (mangaName, mangaObj) {
  var self = this;
  
  self.mangaName = mangaName;
  self.mangaObj = mangaObj;
  self.volume = Object.keys(mangaObj);
  self.list = {};
  self.logo = MangaBase + mangaName + "/logo.png";
  
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
        
        imageObj.onload = function () {
          
          imageCache[url] = {
            src: imageObj,
            width: imageObj.width,
            height: imageObj.height
          };
          
          if (ImageGettingList[url].length) {
             for (var i = 0; i < ImageGettingList[url].length; i++) {
                ImageGettingList[url][i]();
             }
          }
          
          delete  ImageGettingList[url];
          deferred.resolve(imageCache[url]);
        };
        
        imageObj.src = url;
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
