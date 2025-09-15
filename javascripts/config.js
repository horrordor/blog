window.MathJax = {
    tex: {
        inlineMath: [["\\(", "\\)"], ['$', '$']],
        displayMath: [["\\[", "\\]"]],
        processEscapes: true,
        processEnvironments: true
    },
    options: {
        ignoreHtmlClass: ".*|",
        processHtmlClass: "arithmatex"
    }
};

document$.subscribe(() => {
    MathJax.typesetPromise()
})

$('link').each(function () {
    var $intial = $(this).attr('href'),
        $replace = $intial.replace('fonts.googleapis.com/', 'fonts.font.im/');
    console.log($intial);
    console.log($replace);
    $(this).attr('href', $replace);
});


WebFont.load({
    custom: {
        families: ['Ubuntu Mono', 'Source Sans Pro'],
        urls: [
            "/stylesheets/extra.css"
        ]
    }
});
