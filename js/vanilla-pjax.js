/*
 * Plugin Name: Vanilla Pushstate/AJAX
 * Version: 0.18.0
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
    var self = this;

    if (!('pushState' in history)) {
        return false;
    }

    self.isLoading = false;
    self.currentLocation = document.location;
    self.defaultSettings = {
        ajaxParam: 'ajax',
        invalidUrls: [/wp-admin/],
        targetContainer: document.body,
        parentContainer: document,
        useLocalStorage: 0,
        useSessionStorage: 0,
        timeoutBeforeLoadContent: 0,
        timeoutBeforeLoading: 0,
        timeoutBeforeAJAX: 0,
        urlExtensions: ['jpeg', 'svg', 'jpg', 'png', 'gif', 'css', 'js'],
        callbackBeforeAJAX: function(newUrl, item) {},
        callbackAfterAJAX: function(newUrl, content) {},
        callbackTimeoutBeforeAJAX: function(duration, newUrl, data) {
            return duration;
        },
        callbackTimeoutBeforeLoadContent: function(duration, newUrl, content) {
            return duration;
        },
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
        window.addEventListener('popstate', function() {
            self.goToUrl(document.location.href);
        }, 1);
    };

    self.setClickables = function(parent) {
        var links = parent.getElementsByTagName('A');
        for (var link in links) {
            // Intercept click event on each new link
            if (typeof links[link] == 'object' && links[link].getAttribute('data-ajax') !== '1' && self.checkClickable(links[link])) {
                links[link].setAttribute('data-ajax', '1');
                links[link].addEventListener('click', self.clickAction, 1);
                if (self.settings.useSessionStorage || self.settings.useLocalStorage) {
                    links[link].addEventListener('mouseover', self.hoverAction, 1);
                }
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
        e.preventDefault();
        self.goToUrl(this.href, this);
    };

    self.hoverAction = function(e) {
        var url = this.href;
        if (self.settings.useLocalStorage && localStorage.getItem(url)) {
            return;
        }
        if (self.settings.useSessionStorage && sessionStorage.getItem(url)) {
            return;
        }
        self.callUrl(url, function(content) {
            self.cacheUrlContent(url, content);
        });
    };

    // Load an URL
    self.goToUrl = function(url, item) {
        item = item ||  false;
        if (url == self.currentLocation || document.body.getAttribute('data-loading') == 'loading') {
            return;
        }
        self.settings.callbackBeforeAJAX(url, item);
        document.body.setAttribute('data-loading', 'loading');

        var callbackFun = function(content) {
            self.cacheUrlContent(url, content);
            self.settings.callbackAfterAJAX(url, content);

            (function(settings, url, content) {
                /* Load */
                var _timeoutDuration = settings.callbackTimeoutBeforeLoadContent(settings.timeoutBeforeLoadContent, url, content);
                setTimeout(function() {
                    self.loadContent(url, content);
                    /* After load */
                    var _timeoutDuration = settings.callbackTimeoutBeforeLoad(settings.timeoutBeforeLoading, url, content);
                    setTimeout(function() {
                        settings.callbackAllowLoading(url, content);
                        settings.callbackAfterLoad(url, content);
                        self.triggerEvent('vanilla-pjax-ready');
                    }, _timeoutDuration);
                    /* - After load */
                }, _timeoutDuration);
                /* - Load */
            }(self.settings, url, content));

        };
        self.callUrl(url, callbackFun);
    };

    self.callUrl = function(url, callbackFun) {
        var data = {};
        data[self.settings.ajaxParam] = 1;
        var _timeoutDuration = self.settings.callbackTimeoutBeforeAJAX(self.settings.timeoutBeforeAJAX, url, data);
        setTimeout(function() {
            if (self.settings.useLocalStorage && localStorage.getItem(url)) {
                callbackFun(localStorage.getItem(url));
                return;
            }
            if (self.settings.useSessionStorage && sessionStorage.getItem(url)) {
                callbackFun(sessionStorage.getItem(url));
                return;
            }
            self.ajaxCall(url, callbackFun, data);
        }, _timeoutDuration);
    };

    self.ajaxCall = function(url, callbackFun, data) {
        var _req = new XMLHttpRequest(),
            _params = '';
        for (var _d in data) {
            _params += (_d + '=' + data[_d]);
        }
        _req.open('GET', url + '?' + _params, true);
        _req.onload = function() {
            if (this.status >= 200 && this.status < 400) {
                callbackFun(this.response);
            }
        };
        _req.send();
    };

    self.cacheUrlContent = function(url, content) {
        if (self.settings.useLocalStorage) {
            localStorage.setItem(url, content);
        }
        if (self.settings.useSessionStorage) {
            sessionStorage.setItem(url, content);
        }
    };

    self.triggerEvent = function(eventId) {
        var event;
        if (typeof(Event) === 'function') {
            event = new Event(eventId);
        }
        else {
            event = document.createEvent('Event');
            event.initEvent(eventId, true, true);
        }
        window.dispatchEvent(event);
    };

    // Change URL
    self.setUrl = function(url) {
        var urlDetails = document.createElement('a');
        urlDetails.href = url;
        if (url == window.location.href) {
            return;
        }
        // Change URL
        history.pushState({}, document.title, url);
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
