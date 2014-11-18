
var tntApp = angular.module("tntApp", ["ngRoute", "ngAnimate", "ngTouch", "tntControllers"]);

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


function Manga (mangaName, mangaObj, base) {
  var self = this;
  
  self.base = base;
  self.mangaName = mangaName;
  self.mangaObj = mangaObj;
  self.volume = Object.keys(mangaObj);
  self.list = {};
  self.logo = base + mangaName + "/logo.png";
  self.volume.forEach(function (volName) {
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
    
  function RemoveBorder (data) {
        
    var wb = new Uint32Array(data.width * data.height);
    for (var i = 0; i < wb.length; i++) {
      var red = data.data[i * 4];
      var green = data.data[i * 4 + 1];
      var blue = data.data[i * 4 + 2];
      // var alpha = data.data[i * 4 + 3];
      // RGB -> YUV
      wb[i] = 0.299 * red + 0.587 * green + 0.114 * blue;
    }
    
    var cut = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      threshold: 10
    };
    
    // cut top
    for (var i = 0; i < data.height; i++) {
      var mean = 0;
      for (var j = 0; j < data.width; j++) {
        var v = wb[i * data.width + j];
        mean += v;
      }
      mean /= data.width;
      var sd = 0;
      for (var j = 0; j < data.width; j++) {
        var v = wb[i * data.width + j];
        sd += (v - mean) * (v - mean);
      }
      sd /= data.width;
      sd = Math.sqrt(sd);
      if (sd < cut.threshold) {
        cut.top++;
      } else {
        break;
      }
    }
    
    // cut bottom
    for (var i = data.height - 1; i >= 0; i--) {
      var mean = 0;
      for (var j = 0; j < data.width; j++) {
        var v = wb[i * data.width + j];
        mean += v;
      }
      mean /= data.width;
      var sd = 0;
      for (var j = 0; j < data.width; j++) {
        var v = wb[i * data.width + j];
        sd += (v - mean) * (v - mean);
      }
      sd /= data.width;
      sd = Math.sqrt(sd);
      if (sd < cut.threshold) {
        cut.bottom++;
      } else {
        break;
      }
    }
    
    // cut left
    for (var j = 0; j < data.width; j++) {
      var mean = 0;
      for (var i = 0; i < data.height; i++) {
        var v = wb[i * data.width + j];
        mean += v;
      }
      mean /= data.height;
      var sd = 0;
      for (var i = 0; i < data.height; i++) {
        var v = wb[i * data.width + j];
        sd += (v - mean) * (v - mean);
      }
      sd /= data.height;
      sd = Math.sqrt(sd);
      if (sd < cut.threshold) {
        cut.left++;
      } else {
        break;
      }
    }
    
    // cut left
    for (var j = data.width - 1; j >= 0; j--) {
      var mean = 0;
      for (var i = 0; i < data.height; i++) {
        var v = wb[i * data.width + j];
        mean += v;
      }
      mean /= data.height;
      var sd = 0;
      for (var i = 0; i < data.height; i++) {
        var v = wb[i * data.width + j];
        sd += (v - mean) * (v - mean);
      }
      sd /= data.height;
      sd = Math.sqrt(sd);
      if (sd < cut.threshold) {
        cut.right++;
      } else {
        break;
      }
    }
    
    var new_data = context.createImageData(
      data.width - cut.left - cut.right,
      data.height - cut.top - cut.bottom
    );
    for (var i = 0; i < new_data.height; i++) {
      for (var j = 0; j < new_data.width; j++) {
        var old_pos = ((i + cut.top) * data.width + (j + cut.left)) * 4;
        var new_pos = (i * new_data.width + j) * 4;
        new_data.data[new_pos] = data.data[old_pos];
        new_data.data[new_pos + 1] = data.data[old_pos + 1];
        new_data.data[new_pos + 2] = data.data[old_pos + 2];
        new_data.data[new_pos + 3] = data.data[old_pos + 3];
      }
    }
    return new_data;
  }
  
  function ComposeImage (data) {
    var deferred = $q.defer();
    
    var imageObj = new Image();
    imageObj.onload = function () {      
      canvas.width = imageObj.width;
      canvas.height = imageObj.height;
      context.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height, 0, 0, imageObj.width, imageObj.height);
      
      var imageData = context.getImageData(0, 0, imageObj.width, imageObj.height);
      imageData = RemoveBorder(imageData);
      
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      context.putImageData(imageData, 0, 0);
      
      deferred.resolve({
        src: canvas.toDataURL(),
        width: canvas.width,
        height: canvas.height
      });
    };
    imageObj.src = data;
    
    return deferred.promise;
  }
  
  
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
          
          ComposeImage("data:image/" + type + ";base64," + str).then(function (data) {
            imageCache[url] = data;
            deferred.resolve(imageCache[url]);
          });
          
        }).
        error(function () {
          console.log("GetImage: $http error", arguments);
          deferred.reject("$http error");
        });
    }
    return deferred.promise;
  }
  
  return {
    base: base,
    GetImage: GetImage,
    GetManga: GetManga,
    ComposeImage: ComposeImage
  };
});
