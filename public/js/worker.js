

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
  
  //var new_data = context.createImageData(
  //  data.width - left - right,
  //  data.height - top - bottom
  //);
  
  var new_data = {
    width: data.width - left - right,
    height: data.height - top - bottom
  };
  
  //new_data.data = new Uint32Array(new_data.width * new_data.height * 4);
  new_data.data = new Uint8ClampedArray(new_data.width * new_data.height * 4);
  
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


self.addEventListener("message", function(event) {
  
  var id = event.data.id;
  var data = event.data.data;
  
  self.postMessage({
    id: id,
    data: RemoveBorder(data)
  });
  
}, false);

