<?php
if (isset($_GET['is_ajax'])) {
    return;
}
?><!DOCTYPE HTML>
<html lang="en-EN">
<head>
<meta charset="UTF-8" />
<title>JavaScript Utilities - Vanilla PJAX</title>
<link rel="stylesheet" type="text/css" href="css/demo.css" />
<script src="js/script.js"></script>
<script src="js/vanilla-pjax.js"></script>
</head>
<body class="demo-scrollanim">
<h1>JavaScript Utilities - Vanilla PJAX</h1>
<script class="script-visible" contenteditable>window.domReady(function vanillapjaxdomready(){
    new vanillaPJAX({
        targetContainer: document.body.querySelector('.main-content'),
        ajaxParam: 'is_ajax'
    });
});
</script>
<div class="main-content">
