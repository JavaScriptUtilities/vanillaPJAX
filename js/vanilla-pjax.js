/*
 * Plugin Name: Vanilla Pushstate/AJAX
 * Version: 0.15.0
 * Plugin URL: https://github.com/Darklg/JavaScriptUtilities
 * JavaScriptUtilities PJAX may be freely distributed under the MIT license.
 * Required: Vanilla AJAX or jQuery,
 * Usage status: Work in progress
 */
/* jshint browser: true */
/*
 * Todo :
 * - Parse content to extract only area
 */

var vanillaPJAX = function(settings) {
    'use strict';
    var self = this,
        hasPushState = ('pushState' in history);

    self.isLoading = false;
    self.currentLocation = document.location;
    self.defaultSettings = {
        ajaxParam: 'ajax',
        invalidUrls: [/wp-admin/],
        targetContainer: document.body,
        parentContainer: document,
        useLocalStorage: 0,
        useSessionStorage: 0,
        timeoutBeforeLoading: 0,
        timeoutBeforeAJAX: 0,
        urlExtensions: ['jpeg', 'svg', 'jpg', 'png', 'gif', 'css', 'js'],
        callbackBeforeAJAX: function(newUrl, item) {},
        callbackAfterAJAX: function(newUrl, content) {},
        callbackTimeoutBeforeLoad: function(duration, newUrl, content) {
            return duration;
        },
        callbackAllowLoading: function(newUrl, content) {
            // Allow a new page load
            document.body.setAttribute('data-loading', '');
        },
        callbackAfterLoad: function(newUrl, content) {},
        filterContent: function(content) {
            return content;
        },
        isClickable: function(item) {
            return true;
        },
    };

    self.init = function(settings) {
        self.getSettings(settings);
        // Kill if target container isn't defined
        if (!self.settings.targetContainer) {
            return;
        }
        // Set ARIA
        self.setARIA();
        // Set Events
        self.setEvents();
    };

    self.setARIA = function() {
        var el = self.settings.targetContainer;
        // User has requested a page change.
        el.setAttribute('aria-live', 'polite');
        // All the content has changed ( new page content )
        el.setAttribute('aria-atomic', 'true');
    };

    self.setEvents = function() {
        // Click event on all A elements
        self.setClickables(self.settings.parentContainer);
        // Handle history back
        self.addEvent(window, 'popstate', function() {
            self.goToUrl(document.location.href);
        });
        if (!hasPushState) {
            // Load initial page
            window.domReady(self.gotoHashBang);
            // Check for hash change
            self.addEvent(window, 'hashchange', self.gotoHashBang);
        }
    };

    self.setClickables = function(parent) {
        var links = parent.getElementsByTagName('A');
        for (var link in links) {
            // Intercept click event on each new link
            if (typeof links[link] == 'object' && links[link].getAttribute('data-ajax') !== '1' && self.checkClickable(links[link])) {
                links[link].setAttribute('data-ajax', '1');
                self.addEvent(links[link], 'click', self.clickAction);
            }
        }
    };

    self.checkClickable = function(link) {
        // Invalid or external link
        if (!link.href || link.href.slice(-1) == '#' || link.getAttribute('target') == '_blank') {
            return false;
        }
        // Static asset
        var urlExtension = link.pathname.split('.').pop().toLowerCase();
        if (self.inArray(urlExtension, self.settings.urlExtensions)) {
            return false;
        }
        // URL Format
        for (var i = 0, len = self.settings.invalidUrls.length; i < len; i++) {
            if (!!link.href.match(self.settings.invalidUrls[i])) {
                return false;
            }
        }
        // Downloadable link
        if (link.getAttribute('download')) {
            return false;
        }
        // Language link
        var linkLang = link.getAttribute('hreflang'),
            docLang = document.documentElement.lang;
        if (linkLang && !self.contains(linkLang, docLang) && !self.contains(docLang, linkLang)) {
            return false;
        }
        // Disable PJAX
        if (link.getAttribute('data-ajax') === '0') {
            return false;
        }
        // Custom check
        if (!self.settings.isClickable(link)) {
            return false;
        }
        // Not on same domain
        if (document.location.host != link.host) {
            return false;
        }
        return true;
    };

    self.gotoHashBang = function() {
        var link = document.location.hash;
        if (link.slice(0, 2) == '#!') {
            self.goToUrl(link.slice(2));
        }
    };

    self.clickAction = function(e) {
        if (e.metaKey || e.ctrlKey ||  e.altKey || e.shiftKey) {
            return;
        }
        self.eventPreventDefault(e);
        self.goToUrl(this.href, this);
    };

    // Load an URL
    self.goToUrl = function(url, item) {
        item = item ||  false;
        var settings = self.settings;
        if (url == self.currentLocation || document.body.getAttribute('data-loading') == 'loading') {
            return;
        }
        self.settings.callbackBeforeAJAX(url, item);
        document.body.setAttribute('data-loading', 'loading');

        var data = {};
        data[self.settings.ajaxParam] = 1;
        var callbackFun = function(content) {
            if (self.settings.useLocalStorage) {
                localStorage.setItem(url, content);
            }
            if (self.settings.useSessionStorage) {
                sessionStorage.setItem(url, content);
            }
            settings.callbackAfterAJAX(url, content);
            self.loadContent(url, content);
            (function(settings, url, content) {
                var _timeoutDuration = settings.callbackTimeoutBeforeLoad(settings.timeoutBeforeLoading, url, content);
                setTimeout(function() {
                    settings.callbackAllowLoading(url, content);
                    settings.callbackAfterLoad(url, content);
                    window.dispatchEvent(new Event('vanilla-pjax-ready'));
                }, _timeoutDuration);
            }(settings, url, content));
        };
        (function(url, callbackFun, data) {
            setTimeout(function() {
                if (self.settings.useLocalStorage && localStorage.getItem(url)) {
                    callbackFun(localStorage.getItem(url));
                    return;
                }
                if (self.settings.useSessionStorage && sessionStorage.getItem(url)) {
                    callbackFun(sessionStorage.getItem(url));
                    return;
                }
                if (window.jQuery) {
                    jQuery.ajax({
                        url: url,
                        success: callbackFun,
                        data: data
                    });
                }
                else {
                    new jsuAJAX({
                        url: url,
                        callback: callbackFun,
                        data: data
                    });
                }
            }, self.settings.timeoutBeforeAJAX);
        }(url, callbackFun, data));
    };

    // Change URL
    self.setUrl = function(url) {
        var urlDetails = document.createElement('a');
        urlDetails.href = url;
        if (url == window.location.href) {
            return;
        }
        // Change URL
        if (hasPushState) {
            history.pushState({}, document.title, url);
        }
        else {
            document.location.hash = '!' + urlDetails.pathname;
        }
    };

    // Handle the loaded content
    self.loadContent = function(url, content) {
        var settings = self.settings,
            target = settings.targetContainer;
        content = settings.filterContent(content);
        // Update values
        self.currentLocation = url;
        // Set URL
        self.setUrl(url);
        // Load content into target
        target.innerHTML = content;
        // Add events to new links
        self.setClickables(target);
    };

    self.init(settings);
    return self;
};

/* Add event */
vanillaPJAX.prototype.addEvent = function(el, eventName, callback) {
    if (el.addEventListener) {
        el.addEventListener(eventName, callback, false);
    }
    else if (el.attachEvent) {
        el.attachEvent('on' + eventName, function(e) {
            return callback.call(el, e);
        });
    }
};

/* Get Settings */
vanillaPJAX.prototype.getSettings = function(settings) {
    this.settings = {};
    // Set default values
    for (var attr in this.defaultSettings) {
        this.settings[attr] = this.defaultSettings[attr];
    }
    // Set new values
    for (var attr2 in settings) {
        this.settings[attr2] = settings[attr2];
    }
};

/* inArray */
vanillaPJAX.prototype.inArray = function(needle, haystack) {
    var i = 0,
        length = haystack.length;

    for (; i < length; i++) {
        if (haystack[i] === needle) return true;
    }
    return false;
};

/* Contains */
vanillaPJAX.prototype.contains = function(needle, haystack) {
    return haystack.indexOf(needle) != -1;
};

vanillaPJAX.prototype.eventPreventDefault = function(event) {
    return (event.preventDefault) ? event.preventDefault() : event.returnValue = false;
};
