/*!
 * zVisualizer
 * http://code.google.com/p/zviz/
 * Copyright (c) 2009 Kenneth Ko | Licensed under GPL
 */ 
/* 
 * This file is part of zVisualizer.
 *
 * zVisualizer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * zVisualizer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>. 
 * 
 * $Date: $
 * $Rev: $ 
 */
// in case zviz already loaded...
if (typeof zviz != "undefined" && zviz && zviz.destroy) {
	zviz.destroy();
}

// put our jQuery dependencies into our own namespace
var zviz = {};
zviz.jQuery = jQuery.noConflict(true);

//==================== begin zViz =====================

(function($) {
	var styleHref = "http://users.tpg.com.au/fuzziman/zvisualizer/dist//zviz.min.css" //"http://169.254.233.41/zvisualizer/dist/zviz.min.css"; // "169.254.233.41"; //"localhost";
	var styles = "<link type='text/css' rel='stylesheet' href='" + styleHref + "?t=" + (new Date()).getTime() + "' id='zvizStylesheet'/>";	
    $("head").append(styles);		
	
	// printing functions
	function pp(node) {
		var s = node.tagName.toLowerCase();
		if (node.id) s+= "#" + node.id;
		else if (node.className) {
			s+= "." + node.className.split(" ").join(".");
		}
		return s;
	}
	function printDomParents() {
		var s = "";
		var found = false; // ignore parents until we hit the context ref
		var currContext = contextRefStack[contextRefStack.length-1];
		for (var i=0; i<domParents.length; i++) {
			if (found) {
				s += domParents[i] + " > ";
			} else {
				if (domParents[i] == currContext.nodePP) {
					found = true;
				}
			}
		}		
		return s;
	}

	// stores the results of the parsing
	function Result(node) {
		var $node = $(node);
		var pos = $node.css("position");
				
		this.node = node;
		this.nodePP = pp(node);
		this.nodeStr = printDomParents() + this.nodePP;
		this.children = [];	
		this.zIndex = $node.css("zIndex");
		this.z = (this.zIndex=="auto" ? 0 : parseInt(this.zIndex));		// elements with no z-index, 0 or auto are all sorted in document order, see examples/no-z.html	
		this.isPositioned = (pos == "absolute" || pos == "relative" || pos == "fixed");						
		this.isImp = _isImplicitContext(this);	
		this.L = _determineSortLayer(this);
		this.hasContext = _hasContext(this);		
		this.shouldTrack = $node.is(":visible") && (this.isPositioned || this.hasContext);
		this.ff2NegMarginBug = _detectHasFF2NegZIndexBug(this);
	}
	
	// FF2-3.5, Saf3-4/Chr1-2: non-full opacity implicitly creates SC
	function _isImplicitContext(resultObj) {
		return (!resultObj.isPositioned && ($.browser.mozilla || $.browser.safari) && parseFloat($(resultObj.node).css("opacity")) < 1);
	}
	
	function _determineSortLayer(resultObj){
		// 1. positioned with -ve zIndex
		// 2. static
		// 3. float
		// 4. (FF2 only) static/float with opacity
		// 5. positioned (FF3+/WK) static/float with opacity
		var $node = $(resultObj.node);
		if (resultObj.isPositioned) {
			return resultObj.z < 0 ? 1 : 5;
		} else if (resultObj.isImp) {
			return ($.browser.className=="firefox2" ? 4 : 5);
		} else if ($node.css("float") != "none") {
			return 3;
		} else {
			return 2;
		}
	}
	// positioning context detection logic
	function _hasContext(resultObj) {
		var $node = $(resultObj.node);
		if ($node.is("script")) return false;
				
		if (resultObj.isImp) {
			return true;
		}	
			
		if (resultObj.isPositioned) {
		
			// IE6, IE7c: relative/absolute position automatically create ctx, regardless of hasLayout (note: abs pos always hasLayout). IE8 is fine.
			if($.browser.msie && ($.browser.versionX==6 || $.browser.versionX ==7)) {
					return true; 
			}			

			// Any specified zindex will create SC.			
			// NOTE: IE6/7 already returned true. All other browsers (FF/Wbk/Op/IE8) all return "auto" when no zIndex
			return resultObj.zIndex != "auto";			
		}
		return false;
	}	
	
	// FF2 bug, cannot have negative z-index, because they render under the body.	
	// This bug can be fixed when the body gets a stacking context.
	// http://www.slicksurface.com/blog/2007-04/css-z-index-cant-have-negative-values-in-firefox
	function _detectHasFF2NegZIndexBug(resultObj) {
		return ($.browser.className == "firefox2" && resultObj.z < 0 && !rootResult.hasContext);
	}
	
	Result.prototype.toHtml = function(appendToNode) {
		var s = "<div class='resultElem" + (this.isRootResult ? " root" : "") + "'>";
		s += "<p class='L" + this.L + "'>";
		if (this.ff2NegMarginBug) {
			s += "<span class='nodeStr warning ff2NegMarginBug' title='FF2 bug, negative margin elements beneath body unless body has stacking context'>" + this.nodeStr;
		} else {
			s += "<span class='xtrigger" +  (this.children.length > 0 ? " plus" : "") + "'></span>";
			s += "<span class='nodeStr' "
			if (this.L == 4) {
				s+= "title='FF2: elements with implicit stacking context appear below positioned elements in FF2'";
			}
			s += ">" + this.nodeStr; 		
		}		
		if (this.isImp) {
			s += " (implicit) ";
		} else {
			s += " (" + this.zIndex + ") ";
		}
		s += "</span>"; 
		s += "</p>"; 
		s += ("</div>");
		var $s = $(s);
		$.data($s[0], "zviz_node", this);
		
		if (this.children.length > 0) {
			var ch = $("<div class='children' style='display:none'></div>");
			for(var i=0; i<this.children.length; i++) {
				ch.append(this.children[i].toHtml());
			}	
			$s.append(ch);
		}
		return $s;
	};	
	Result.prototype.compareTo = function(r2) {
		if (this.L > r2.L)
			return 1;
		else if (this.L < r2.L)
			return -1;
		else {
			if (this.z > r2.z) 
				return 1;
			else if (this.z < r2.z) 
				return -1;
			else 
				return 0;
		}
	};
	Result.prototype.sort = function() {
		_insertionsort(this.children);
		for(var i=0; i<this.children.length; i++) {
			this.children[i].sort();
		}		
	};
	/* http://www.inf.fh-flensburg.de/lang/algorithmen/sortieren/insert/insertionen.htm */
	function _insertionsort(a) {
		var i, j, t;
		var n=a.length;
		for (i=1; i<n; i++)	{
			j=i;
			t=a[j];
			while (j>0 && a[j-1].compareTo(t)===1){
				a[j]=a[j-1];
				j--;
			}
			a[j]=t;
		}
	}

	// recursively parse nodes
	function parse(x) {	
		
		// Note the selector for the children() call.
		// For jquery bug, where FF2 does not like expandos on either the object or applet tag.
		// Avoid the issue by not letting jquery touch the applet at all
		// http://www.nabble.com/jQuery-throwing-error-with-applet-on-page-in-FF-2.0.0.13-td16456878s27240.html
		var children = x.children("*:not(object):not(embed):not(applet)"); 
		
		domParents.push(pp(x[0]));		
		for(var i=0; i<children.length; i++) {
		
			var $node = children.eq(i);

			if ($node.is("[id^=zVisualizer]")) {
				continue;	// ignore any zVisualizer elements
			}			
			var pushed = false;
			var r = new Result($node[0]);
			if (r.shouldTrack) {				
				contextRefStack[contextRefStack.length-1].children.push(r);	// add child result as a child of current context
				if (r.hasContext) {
					contextRefStack.push(r);	// if creates context, this child result is now the current context
					pushed = true;
				}				
			}
			if ($node.children().length>0) {
				parse($node);
			}			
			if (pushed) {
				contextRefStack.pop();		
			}
		}
		domParents.pop();
		return;
	}
	
	// ---- creating the popup ----
	$( "<div id='zVisualizer'>\
			<div class='hd'>\
				zVisualizer\
				<a class='toggleSecondary' title='Click here to toggle between the simplified view or the detailed view'></a>\
				<a class='reload' title='Refresh zVisualizer with the current state of the page (ctrl+shift+r)'></a>\
				<a class='close' title='Close zVisualizer'></a>\
			</div>\
			<div class='results'></div>\
			<div class='ft'></div>\
		</div>")
		.css({top: ($(document).scrollTop() + 20) + "px", left: ($(document).scrollLeft() + 100) + "px"})
		.appendTo("body");
	
	$("div#zVisualizer").draggable({handle: 'div.hd'});  // note: drag for shim only attached if shim is created

	$("div#zVisualizer").resizable({
		alsoResize: "div#zVisualizer .results, #zVisualizerShim",
		handles: "w, e, s, se, sw"
	});
	
	//------ hover handling --------
	
	$("#zVisualizer .results").mouseover(function(evt) {
		var target = $(evt.target);		
		
		// highlighting the box in the popup
		var resultElem;
		if (target.is(".resultElem")) {
			resultElem = target;
		} else {
			resultElem = target.parents(".resultElem").eq(0);
		}
		if (resultElem.length ==0) return;
		
		var data = $.data(resultElem[0], "zviz_node");	
		var node = data.node;
		
		if (node == document.body) {
		//	$("#zVisualizer .results").find(".selected").removeClass("selected");
		} else {
			_highlight(node);
			
			//if (!resultElem.hasClass("selected")) {
				//$("#zVisualizer .results").find(".selected").removeClass("selected"); 		
				resultElem.addClass("selected"); 
			//}
		}		
		
		return false;
	});

	$("#zVisualizer .results").mouseout(function(evt) {
		$("#zVisualizerHL").hide();
		$("#zVisualizer .results").find(".selected").removeClass("selected");
		return false;
	});	
	
	// highlight an element like firebug
	function _highlight(elem) {
		var $elem = $(elem);
		if ($("#zVisualizerHL").length==0)
			$("body").append("<div id='zVisualizerHL'></div>");
		$("#zVisualizerHL")
			.css({position:"absolute",zIndex:9998, backgroundColor:"#9fd8ef", opacity:0.9, top: $elem.offset().top, left: $elem.offset().left})
			.width($elem.outerWidth())
			.height($elem.outerHeight())
			.show();
	}
	
	//------ handler for plus/minus button --------
	
	// attach once to #zVisualizer so it still works after reload
	$("#zVisualizer").click(function(evt) {
		var $target = $(evt.target)
		if ($target.is(".xtrigger.minus")) {
			$target.removeClass("minus").addClass("plus").parent().siblings(".children").hide();
		} else if ($target.is(".xtrigger.plus")) {
			$target.removeClass("plus").addClass("minus").parent().siblings(".children").show();
		}
	});
	
	//------ destroy and cleanup zVisualizer --------
	
	function destroy() {
		$("#zvizStylesheet, #zvizScript, #zVisualizer, #zVisualizerHL, #zVisualizerShim, #zVisualizerTooltip ").remove();
		zviz.jQuery = null;
		zviz = null;
		domParents=null;
		contextRefStack=null;
		rootResult=null;
		_detachKeys();
	}	
	$("#zVisualizer div.hd a.close").click(destroy);	
	zviz.destroy = destroy;	
	
	//------ when too many results, show a simplified view --------
	
	var _secondaryHidden = true;
	function _toggleSecondary() {
		if (_secondaryHidden) {
			// switch to detailed view
			$("#zVisualizer .secondary").removeClass("secondary").addClass("secondaryShown");
			_secondaryHidden = false;
			$(this).addClass("toggleSecondaryMinus").removeClass("toggleSecondaryPlus");
			$("#zVisualizer .ft").html("detailed view");
		} else {
			// switch to simplified view
			$("#zVisualizer .secondaryShown").removeClass("secondaryShown").addClass("secondary");
			_secondaryHidden = true;		
			$(this).addClass("toggleSecondaryPlus").removeClass("toggleSecondaryMinus");
			$("#zVisualizer .ft").html("simplified view");
		}
		_postLoad();
	}
	$("#zVisualizer div.hd a.toggleSecondary").click(_toggleSecondary);		
	
	// hide results of the root context which have no children and have no z-index
	function _markSecondary() {
		if (rootResult.children.length > 20) {
			$("#zVisualizer .results > .resultElem > .children > .resultElem").each(function() {
				var data = $.data(this, "zviz_node");
				if (data.children.length==0 && data.z ===0) {
					$(this).addClass("secondary");
				}
			});
			$("#zVisualizer .ft").html("simplified view");
			$("#zVisualizer .hd .toggleSecondary").addClass("toggleSecondaryPlus");
			_secondaryHidden = true;
		} else {
			$("#zVisualizer .toggleSecondary").hide();
			$("#zVisualizer .ft").html("");
		}		
	}
	
	//---- iframe shim for select, flash, and applets ------
	function _shim() {
		if ($.browser.name=="msie" || $.browser.name=="firefox" || $.browser.name=="chrome") {
			setTimeout(function() {		
				$("#zVisualizerShim").remove();
				var extra = $.browser.name=="firefox" ? 1 : 0; // shim needs to be a bit bigger in firefox, border goes funny when dragging
				var zvizElem = $("#zVisualizer");
				var w = zvizElem.outerWidth() + extra*2;
				var h = zvizElem.outerHeight() + extra*2;
				var t = zvizElem.position().top - extra;
				var l = zvizElem.position().left - extra;
				$("<iframe id='zVisualizerShim' frameborder='0' tabindex='-1' src='javascript:false;' />")
					.width(w + "px")
					.height(h + "px")
					.css({top: t + "px",left: l + "px"})
					.insertBefore(zvizElem[0]);
				$('#zVisualizer').bind('drag', function(event, ui) {
					var pos = $("#zVisualizer").position();
					$("#zVisualizerShim").css({top: (pos.top-extra) + "px", left: (pos.left-extra) + "px"});
				});
			}, 100);
		}	
	}
	
	//------ keyboard support ----------
	// ctrl+shift+r to reload (this is only a shortcut in firefox, but thankfully we can preventDefault
	function _keyhandler(evt) {
		reload();
		evt.stopPropagation();  
		evt.preventDefault();
		return false;		
	}
	function _detachKeys() {
		$(document).unbind('keydown', 'ctrl+shift+r', _keyhandler);
	}
	$(document).bind('keydown','ctrl+shift+r', _keyhandler);
	
	
	//----- Fix IE6 background-image caching problem -----
	function _fixIE6BackgroundImageCache() {
		if($.browser.msie && $.browser.versionX=="6") {
		  try {
			document.execCommand("BackgroundImageCache", false, true);
		  } catch(err) {}
		}
	}
	_fixIE6BackgroundImageCache();
	
	//----- move firefox 2 elems ------
	function _moveFF2BugElems() {
		var w = zviz.jQuery(".resultElem > .L1 > a.ff2NegMarginBug");
		var r = w.parent().parent();
		r.insertBefore(w.parents("div.results").children(0));	
	}
	
	// ---- parse the document ----
	var domParents,contextRefStack,rootResult;
	function reload() {
		domParents = [];
		contextRefStack=[];
		rootResult = new Result($("body")[0]);	
		rootResult.isRootResult = true;
		contextRefStack.push(rootResult);
		//$("#zVisualizer .results *").remove();
		$("#zVisualizer .ft").html("loading...");
		
		// let it render and show that it is loading
		setTimeout(function() {
			parse($("body"));
			rootResult.sort();
			$("#zVisualizer .results").html(rootResult.toHtml());		
			_moveFF2BugElems();
			_markSecondary();		
			//$("#zVisualizer .results > div.resultElem > p > .xtrigger").click();
			_shim();
			$("#zVisualizer a[title]").tooltip({id: "zVisualizerTooltip"});
			_postLoad();
		}, 100);
	}
	$("#zVisualizer div.hd a.reload").click(reload);
	reload();
	
	
	// user friendly changes, called on reload and toggleSecondary
	function _postLoad() {
		var root = $("#zVisualizer > .results > .resultElem.root");
		var trigger = root.children("p").children(".xtrigger");
		var rootChildren = root.children(".children");
		if (rootChildren.children().length == rootChildren.children(".secondary").length) {
			// all the children are secondary, hide the trigger icon
			trigger.removeClass("plus").removeClass("minus");
		} else {
			// expand the root children
			trigger.addClass("minus");
			rootChildren.show();
		}
	}
	
	//window.rootResult = rootResult;
})(zviz.jQuery);







