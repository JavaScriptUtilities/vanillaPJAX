<?php
if (isset($_GET['is_ajax'])) {
    return;
}
?>
</div>
<hr />
<p>
<small>
    <img src="images/banana.gif" height="20"  alt="" />
    Gif does not stop between page switch.<br />
    Watch the URL !
</small>
</p>
<p>
    <a href="https://github.com/JavaScriptUtilities/vanillaPJAX" target="_blank">This external link</a> is ignored.<br />
    <a href="images/banana.gif" target="_blank">This link to an image</a> is ignored.
</p>
</body>
</html>
