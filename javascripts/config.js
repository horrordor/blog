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
        $replace = $intial.replace('https://fonts.googleapis.com/', 'https://fonts.font.im/');
    console.log($intial);
    console.log($replace);
    $(this).attr('href', $replace);
});
