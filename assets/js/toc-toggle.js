// TOC toggle functionality
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const tocToggles = document.querySelectorAll('.toc-toggle');
        tocToggles.forEach(toggle => {
            const widgetToc = toggle.closest('.widget').querySelector('.widget--toc');
            if (!widgetToc) return;

            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                widgetToc.classList.toggle('collapsed');
            });
        });
    });
})();