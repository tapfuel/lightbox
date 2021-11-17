/**
 * Copyright:   (c) 2021 Zachary Kendall Watkins <zwatkins.it@gmail.com>
 * Author URI:  https://github.com/zachwatkins/
 * License:     MIT
 * License URI: https://spdx.org/licenses/MIT.html
 * Vendor:      Tapfuel (a.k.a. Zachary Kendall Watkins)
 * Package:     Sleightbox (jQuery plugin)
 * Version:     0.8.0
 * Plugin URI:  https://github.com/tapfuel/sleightbox
 * Requires:    jquery@^1.11.0
 */
(function ($) {
	$.fn.slightbox = function (options) {
		if (options === undefined) {
			options = {};
		}
		var opts = $.extend({}, $.fn.slightbox.defaults, options);
		// Fill out more info for breakpoints to make them easier to manage performantly.
		for (var i = 0; i < opts.sizes.length; i++) {
			var size = opts.sizes[i];
			var prev_width = i === 0 ? 0 : opts.breakpoints[opts.sizes[i - 1]].width;
			opts.breakpoints[size].minwidth = prev_width;
			opts.breakpoints[size].nomaxwidth =
				i === opts.sizes.length - 1 ? true : false;
		}
		opts.breakpoint = $.fn.slightbox.getBreakpoint(opts);
		return this.each(function () {
			var elem = $(this);
			$.fn.slightbox.init(elem, opts);
		});
	};
	$.fn.slightbox.getBreakpoint = function (options) {
		var sizePassed;
		for (var i = 0; i < options.sizes.length; i++) {
			var size = options.sizes[i];
			var width = options.breakpoints[size].width;
			sizePassed = size;
			if (window.innerWidth < width) {
				break;
			}
		}
		return sizePassed;
	};
	$.fn.slightbox.updateBreakpoint = function ($elem) {
		var options = $elem.data("slightbox");
		$elem.removeClass("lightbox-breakpoint-" + options.breakpoint);
		$elem
			.find(".lightbox-content-scroll-" + options.breakpoint)
			.css("max-height", "");
		options.breakpoint = $.fn.slightbox.getBreakpoint(options);
		$elem.addClass("lightbox-breakpoint-" + options.breakpoint);
		$elem.data("slightbox", options);
	};
	$.fn.slightbox.detectBreakpointChange = function ($elem) {
		var options = $elem.data("slightbox");
		var bp_data = options.breakpoints[options.breakpoint];
		var bp_changed = false;
		if (window.innerWidth > bp_data.minwidth) {
			if (!bp_data.nomaxwidth && window.innerWidth >= bp_data.width) {
				// Breakpoint has stepped up.
				bp_changed = true;
			}
		} else {
			// Breakpoint has stepped down.
			bp_changed = true;
		}
		if (bp_changed) {
			// The breakpoint has changed.
			$elem.trigger("slightbox:breakpointchange");
			return true;
		} else {
			return false;
		}
	};
	$.fn.slightbox.setViewportMaxHeight = function ($elem) {
		var options = $elem.data("slightbox");
		var vh = options.breakpoints[options.breakpoint].lightboxheight;
		$elem.find(".lightbox-viewport").css("max-height", vh + "%");
		options.viewportheight = vh;
		$elem.data("slightbox", options);
	};
	$.fn.slightbox.open = function (e) {
		var options = e.data.elem.data("slightbox");
		// Prep the content container height as quickly as possible.
		e.data.elem
			.css({
				opacity: "0",
				visibility: "visible"
			})
			.removeClass("lightbox-hidden");
		if (
			options.hasOwnProperty("preopencb") &&
			typeof options.preopencb === "function"
		) {
			var finishOpening = options.preopencb(e, options, $.fn.slightbox.finishOpening);
			if ( ! finishOpening ) {
				e.data.elem
					.css({
						opacity: "",
						visibility: ""
					})
					.addClass("lightbox-hidden");
			}
		} else {
			$.fn.slightbox.finishOpening(e);
		}
	};
	$.fn.slightbox.finishOpening = function (e) {
		window.requestAnimationFrame(function () {
			$.fn.slightbox.setViewportMaxHeight(e.data.elem);
			$.fn.slightbox.setContentScrollMaxHeight(e.data.elem);
			e.data.elem.css({
				opacity: "",
				visibility: ""
			});
		});
		// Save the last clicked button for when the keyboard is used to escape back into the page.
		if (e.target !== undefined) {
			// A button was clicked.
			var data = e.data.elem.data("slightbox");
			data.lastclicked = e.target;
			e.data.elem.data("slightbox", data);
		}
	};
	$.fn.slightbox.init = function ($elem, options) {
		// Get the max height of the lightbox viewport setting based on the breakpoint.
		var vh = options.breakpoints[options.breakpoint].lightboxheight,
		    new_vp_css = {"max-height": vh + "%"};
		if ( options.hasOwnProperty("maxwidth") && typeof options.maxwidth === "string" ) {
			new_vp_css["max-width"] = options.maxwidth;
		}
		options.viewportheight = vh;
		$elem.data("slightbox", options);
		$elem
			.addClass("lightbox-breakpoint-" + options.breakpoint)
			.find(".lightbox-viewport")
			.css(new_vp_css);
		$("body").on("click", options.button, { elem: $elem }, $.fn.slightbox.open);
		var $close_btn = $elem.find(".lightbox-close");
		$elem.add($close_btn).on("click", { elem: $elem }, $.fn.slightbox.close);
		$elem.on("slightbox:breakpointchange", $.fn.slightbox.onBreakpointChange);
		$(window).on("resize", { elem: $elem }, $.fn.slightbox.resize);
		$(document).on("keydown", { elem: $elem }, $.fn.slightbox.keyboardClose);
		if ($elem.attr("data-lb-open") !== undefined) {
			$.fn.slightbox.open({ data: { elem: $elem } });
		}
	};
	$.fn.slightbox.onBreakpointChange = function () {
		var $this = $(this);
		if (!$this.hasClass("lightbox-hidden")) {
			$this.off("slightbox:breakpointchange", $.fn.slightbox.onBreakpointChange);
			$(window).off("resize", { elem: $this }, $.fn.slightbox.resize);
			$.fn.slightbox.updateBreakpoint($this);
			$.fn.slightbox.setViewportMaxHeight($this);
			$.fn.slightbox.setContentScrollMaxHeight($this);
			$this.on("slightbox:breakpointchange", $.fn.slightbox.onBreakpointChange);
			$(window).on("resize", { elem: $this }, $.fn.slightbox.resize);
		}
	};
	$.fn.slightbox.close = function (e) {
		if (
			e.target.className === "lightbox-close" ||
			e.target.className === "lightbox-viewport-outer"
		) {
			e.data.elem.addClass("lightbox-hidden");
		}
	};
	$.fn.slightbox.keyboardClose = function (e) {
		// This function is primarily for accessibility sake, but users who like using the keyboard will appreciate it too. This will return focus to the button that opened the lightbox if the user closes the window with the escape key.
		if (27 === e.keyCode && !e.data.elem.hasClass("lightbox-hidden")) {
			// Escape key, close the window.
			e.data.elem.addClass("lightbox-hidden");
			var data = e.data.elem.data("slightbox");
			if (data.hasOwnProperty("lastclicked")) {
				data.lastclicked.focus();
			}
		}
	};
	$.fn.slightbox.setContentScrollMaxHeight = function ($elem) {
		var options = $elem.data("slightbox");
		var viewport_percent_height =
			options.breakpoints[options.breakpoint].lightboxheight / 100;
		var content_top_offset = $elem.find(".lightbox-content").position().top;
		var content_bottom_offset = parseInt(
			$elem.find(".lightbox-viewport").css("padding-bottom")
		);
		var maxheight =
			window.innerHeight * viewport_percent_height -
			content_top_offset -
			content_bottom_offset;
		$elem
			.find(".lightbox-content-scroll-" + options.breakpoint)
			.each(function () {
				var detect_largest_height = this.clientHeight;
				if (detect_largest_height < this.scrollHeight) {
					detect_largest_height = this.scrollHeight;
				}
				var newMaxHeight =
					maxheight < detect_largest_height ? maxheight + "px" : "";
				this.style.maxHeight = newMaxHeight;
			});
	};
	$.fn.slightbox.resize = function (e) {
		if (!e.data.elem.hasClass("lightbox-hidden")) {
			var detected = $.fn.slightbox.detectBreakpointChange(e.data.elem);
			if (false === detected) {
				// The breakpoint didn't change, so let's change it just a little bit.
				$.fn.slightbox.setViewportMaxHeight(e.data.elem);
				$.fn.slightbox.setContentScrollMaxHeight(e.data.elem);
			}
		}
	};
	// The reason we have the maxheight properties set in JS is to help the scroll height calculations.
	$.fn.slightbox.defaults = {
		button: ".lightbox-open",
		sizes: ["small", "medium"],
		breakpoints: {
			small: {
				width: 640,
				lightboxheight: 90
			},
			medium: {
				width: 1024,
				lightboxheight: 60
			}
		}
	};
})(jQuery);
