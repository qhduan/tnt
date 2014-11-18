
var tntApp = angular.module("tntApp", ["ngRoute", "ngAnimate", "tntControllers"]);

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
    when("/slideView/:mangaName/:volName/:pageNumber", {
      templateUrl: "template/slideView.html",
      controller: "slideViewController"
    }).
    when("/seriesView/:mangaName/:volName", {
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


function Manga (mangaName, mangaObj, base) {
  var self = this;
  
  self.base = base;
  self.mangaName = mangaName;
  self.mangaObj = mangaObj;
  self.list = {};
  self.logo = base + mangaName + "/logo.png";
  Object.keys(mangaObj).forEach(function (volName) {
    mangaObj[volName].forEach(function (imageName, i) {
      var key = mangaName + "-" + volName + "-" + i;
      self.list[key] = {
        mangaName: mangaName,
        volName: volName,
        imageName: imageName,
        number: i,
        url: base + mangaName + "/" + volName + "/" + imageName
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
  var base = "/";
  
  function GetImage (url) {
    var deferred = $q.defer();
    
    if (imageCache[url]) {
      deferred.resolve(imageCache[url]);
    } else {
      $http.get(url, {responseType: "arraybuffer"})
        .success(function (data) {
          var arr = new Uint8Array(data);
          var str = new Array(arr.length);
          for (var i = 0; i < arr.length; i++) {
            str[i] = String.fromCharCode(arr[i]);
          }
          str = str.join("");
          str = window.btoa(str);
                    
          var type = "jpeg";
          if (url.match(/\.png/i)) type = "png";
          else if (url.match(/\.gif/i)) type = "gif";
          else if (url.match(/\.bmp/i)) type = "bmp";
          
          imageCache[url] = "data:image/" + type + ";base64," + str;
          deferred.resolve(imageCache[url]);
        }).
        error(function () {
          console.log("GetImage: $http error", arguments);
          deferred.reject("$http error");
        });
    }
    return deferred.promise;
  }
  
  function GetManga (mangaName) {
    var deferred = $q.defer();
    
    if (mangaCache[mangaName]) {
      deferred.resolve(mangaCache[mangaName]);
    } else {
      $http.get(base + window.encodeURIComponent(mangaName) + "/manga.json")
        .success(function (mangaObj) {
          
          var m = new Manga(mangaName, mangaObj, base);
          mangaCache[mangaName] = m;
          deferred.resolve(mangaCache[mangaName]);
        }).
        error(function () {
          console.log("GetManga: $http error", arguments);
          deferred.reject("$http error");
        });
    }
    return deferred.promise;
  }
  
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  function ComposeImage (data) {
    var deferred = $q.defer();
    var imageObj = new Image();
    imageObj.onload = function () {
      canvas.width = imageObj.width;
      canvas.height = imageObj.height;
      context.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height, 0, 0, imageObj.width, imageObj.height);
      var result = canvas.toDataURL();
      deferred.resolve({
        src: result,
        width: imageObj.width,
        height: imageObj.height
      });
    };
    imageObj.src = data;
    return deferred.promise;
  }
  
  return {
    base: base,
    GetImage: GetImage,
    GetManga: GetManga,
    ComposeImage: ComposeImage
  };
});
