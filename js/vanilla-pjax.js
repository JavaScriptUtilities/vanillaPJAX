/*
 * Plugin Name: Vanilla Pushstate/AJAX
 * Version: 0.18.2
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
    var _defaultSettings = {
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
        callbackAfterLoad: function(newUrl, content) {
            // Change page title
            // document.title = 'My new title';
        },
        filterContent: function(content) {
            return content;
        },
        isClickable: function(item) {
            return true;
        },
    };

    /* Config */
    var _settings = {};
    var _targetContainer = false;
    var _useLocalStorage = false;
    var _useSessionStorage = false;

    self.init = function(settings) {

        // Set default values
        for (var attr in _defaultSettings) {
            _settings[attr] = _defaultSettings[attr];
        }
        // Set custom values
        for (var attr2 in settings) {
            _settings[attr2] = settings[attr2];
        }

        _targetContainer = _settings.targetContainer;
        _useLocalStorage = _settings.useLocalStorage;
        _useSessionStorage = _settings.useSessionStorage;

        // Kill if target container isn't defined
        if (!_targetContainer) {
            return;
        }
        // Set ARIA
        self.setARIA();
        // Set Events
        self.setEvents();
    };

    self.setARIA = function() {
        var el = _targetContainer;
        // User has requested a page change.
        el.setAttribute('aria-live', 'polite');
        // All the content has changed ( new page content )
        el.setAttribute('aria-atomic', 'true');
    };

    self.setEvents = function() {
        // Click event on all A elements
        self.setClickables(_settings.parentContainer);
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
                if (_useSessionStorage || _useLocalStorage) {
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
        if (self.inArray(urlExtension, _settings.urlExtensions)) {
            return false;
        }
        // URL Format
        for (var i = 0, len = _settings.invalidUrls.length; i < len; i++) {
            if (!!link.href.match(_settings.invalidUrls[i])) {
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
        if (linkLang && linkLang.indexOf(docLang) < 0 && docLang.indexOf(linkLang) < 0) {
            return false;
        }
        // Disable PJAX
        if (link.getAttribute('data-ajax') === '0') {
            return false;
        }
        // Custom check
        if (!_settings.isClickable(link)) {
            return false;
        }
        // Not on same domain
        if (document.location.host != link.host) {
            return false;
        }
        return true;
    };

    self.clickAction = function(e) {
        if (e.metaKey || e.ctrlKey ||  e.altKey || e.shiftKey) {
            return;
        }
        e.preventDefault();
        self.goToUrl(this.href, this);
    };

    self.hoverAction = function() {
        var url = this.href;
        if (_useLocalStorage && localStorage.getItem(url)) {
            return;
        }
        if (_useSessionStorage && sessionStorage.getItem(url)) {
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
        _settings.callbackBeforeAJAX(url, item);
        document.body.setAttribute('data-loading', 'loading');
        var callbackFun = function(content) {
            self.cacheUrlContent(url, content);
            _settings.callbackAfterAJAX(url, content);

            (function(settings, url, content) {
                /* Load */
                var _timeoutDurationBeforeLoadContent = settings.callbackTimeoutBeforeLoadContent(settings.timeoutBeforeLoadContent, url, content);
                var _timeoutDurationBeforeLoading = settings.callbackTimeoutBeforeLoad(settings.timeoutBeforeLoading, url, content);
                setTimeout(function() {
                    self.loadContent(url, content);
                    /* After load */
                    setTimeout(function() {
                        settings.callbackAllowLoading(url, content);
                        settings.callbackAfterLoad(url, content);
                        window.dispatchEvent(new Event('vanilla-pjax-ready'));
                    }, _timeoutDurationBeforeLoading);
                    /* - After load */
                }, _timeoutDurationBeforeLoadContent);
                /* - Load */
            }(_settings, url, content));

        };
        self.callUrl(url, callbackFun);
    };

    self.callUrl = function(url, callbackFun) {
        var data = {};
        data[_settings.ajaxParam] = 1;
        var _timeoutDuration = _settings.callbackTimeoutBeforeAJAX(_settings.timeoutBeforeAJAX, url, data);
        setTimeout(function() {
            if (_useLocalStorage && localStorage.getItem(url)) {
                callbackFun(localStorage.getItem(url));
                return;
            }
            if (_useSessionStorage && sessionStorage.getItem(url)) {
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
            if (_req.status >= 200 && _req.status < 400) {
                callbackFun(_req.response);
            }
        };
        _req.send();
    };

    self.cacheUrlContent = function(url, content) {
        if (_useLocalStorage) {
            localStorage.setItem(url, content);
        }
        if (_useSessionStorage) {
            sessionStorage.setItem(url, content);
        }
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
        content = _settings.filterContent(content);
        // Update values
        self.currentLocation = url;
        // Set URL
        self.setUrl(url);
        // Load content into target
        _targetContainer.innerHTML = content;
        // Add events to new links
        self.setClickables(_targetContainer);
    };

    self.init(settings);
    return self;
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
