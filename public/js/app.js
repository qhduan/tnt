
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
    
    var left = 0;
    var right = 0;
    var top = 0;
    var bottom = 0;
    var threshold = 10;
    
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
      if (sd < threshold) {
        top++;
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
      if (sd < threshold) {
        bottom++;
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
      if (sd < threshold) {
        left++;
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
      if (sd < threshold) {
        right++;
      } else {
        break;
      }
    }
    
    var new_data = context.createImageData(
      data.width - left - right,
      data.height - top - bottom
    );
    for (var i = 0; i < new_data.height; i++) {
      for (var j = 0; j < new_data.width; j++) {
        var old_pos = ((i + top) * data.width + (j + left)) * 4;
        var new_pos = (i * new_data.width + j) * 4;
        new_data.data[new_pos] = data.data[old_pos];
        new_data.data[new_pos + 1] = data.data[old_pos + 1];
        new_data.data[new_pos + 2] = data.data[old_pos + 2];
        new_data.data[new_pos + 3] = data.data[old_pos + 3];
      }
    }
    return new_data;
  }
  
  
  var worker = new Worker("js/worker.js");
  var worker_quest = {};
  worker.onmessage = function (event) {
    var id = event.data.id;
    var imageData = event.data.data;
    worker_quest[id](imageData);
    delete worker_quest[id];
  };
  function WorkRemoveBorder (imageData, callback) {
    var id = (new Date().getTime() * Math.random()).toFixed(0);
    worker_quest[id] = callback;
    worker.postMessage({
      id: id,
      data: imageData
    });
  }
  
  function GetImage (url) {
    var deferred = $q.defer();
    
    if (imageCache[url]) {
      deferred.resolve(imageCache[url]);
    } else {      
      var imageObj = new Image();
      
      imageObj.onload = function () {        
        canvas.width = imageObj.width;
        canvas.height = imageObj.height;
        context.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height, 0, 0, imageObj.width, imageObj.height);
        
        var imageData = context.getImageData(0, 0, imageObj.width, imageObj.height);
        
        WorkRemoveBorder(imageData, function (data) {
          var imageData = context.createImageData(data.width, data.height);
          for (var i = 0; i < imageData.data.length; i++) {
            imageData.data[i] = data.data[i];
          }
          
          canvas.width = imageData.width;
          canvas.height = imageData.height;
          context.putImageData(imageData, 0, 0);
          
          imageCache[url] = {
            src: canvas.toDataURL("image/jpeg", 0.5),
            width: imageData.width,
            height: imageData.height
          }; 
          
          deferred.resolve(imageCache[url]);
        });
        
        /*
        imageData = RemoveBorder(imageData);
        
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        context.putImageData(imageData, 0, 0);
        
        imageCache[url] = {
          src: canvas.toDataURL("image/jpeg", 0.5),
          width: imageData.width,
          height: imageData.height
        }; 
        
        deferred.resolve(imageCache[url]);
        var mid = new Date().getTime();
        console.log("solved", mid - st);
        st = mid;
        */
      };
      
      imageObj.src = url;
    }
    return deferred.promise;
  }
  
  return {
    base: base,
    GetImage: GetImage,
    GetManga: GetManga//,
    //ComposeImage: ComposeImage
  };
});
