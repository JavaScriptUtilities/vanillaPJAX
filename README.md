# Vanilla Pushstate/AJAX

Switch between pages smoothly with AJAX.

Warning : PHP is required to try the demo website.

## How to install

### Load code in header

```html
<script src="js/vanilla-pjax.js"></script>
```
### Choose a container in your code.

For this exemple, we will use the `.main-content` container

### Prevent useless content at ajax call :

In your code, hide everything around the `.main-content` container, including its HTML tags if the URL contains the parameter is_ajax=1.

### Trigger following script at domready.

```js
new vanillaPJAX({
    targetContainer: document.body.querySelector('.main-content'),
    ajaxParam: 'is_ajax'
});
```

### Settings :

* **useSessionStorage** : Cache page content in Session storage.
* **useLocalStorage** : Cache page content in Local storage.


### Notes :

* If a session/local storage setting is enabled, links will be preloaded on mouseover.
