(function(rootPath) {

	function _zvizBookmarklet() {  
	  var head = document.getElementsByTagName("head")[0];
	  var script = document.createElement("script");
	  script.id = "zvizScript";
	  script.type="text/javascript";
	  script.src="{0}/zviz.dist.js?t=" + (new Date()).getTime() ;
	  var _onError = function() {
		head.removeChild(script); 
		alert("Problem loading!");
	  };	  
	  var done = false;
	  script.onload = script.onreadystatechange = function(){
		if (!done && (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") ) {
		  script.onload = script.onreadystatechange = null;
		  if (typeof(zviz)=="undefined" || zviz===null) _onError();
		}
	  };
	  script.onerror = function() {
		_onError();
	  };
	  head.appendChild(script);
	}

	function _toBookmarklet(fn) {
		return "javascript:(" + fn.toString().replace("{0}", rootPath).replace(/\n/g, "").replace(/^(function)([^\(]*)\(/, "$1(") + ")()";
	}

	var s = _toBookmarklet(_zvizBookmarklet);
	document.getElementById("bookmarklet").href=s;
	
})("http://users.tpg.com.au/fuzziman/zvisualizer/dist");	// "http://169.254.233.41/zvisualizer/dist"; //"http://localhost/zvisualizer/dist";