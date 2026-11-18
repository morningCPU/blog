(function () {
    'use strict';

    var content = document.querySelector('.article-content');
    if (!content) return;

    var images = Array.prototype.filter.call(
        content.querySelectorAll('img.article-content-image'),
        function (img) {
            return !img.closest('a') && !img.hasAttribute('data-no-lightbox');
        }
    );
    if (!images.length) return;

    var currentIndex = -1;
    var previousFocus = null;
    var closeTimer = 0;

    var overlay = document.createElement('div');
    overlay.className = 'article-lightbox';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '图片预览');
    overlay.innerHTML = [
        '<div class="article-lightbox__backdrop" data-lightbox-close></div>',
        '<div class="article-lightbox__stage">',
        '  <img class="article-lightbox__image" alt="">',
        '</div>',
        '<div class="article-lightbox__toolbar">',
        '  <button type="button" class="article-lightbox__button" data-lightbox-prev aria-label="上一张图片">‹</button>',
        '  <span class="article-lightbox__counter" aria-live="polite"></span>',
        '  <button type="button" class="article-lightbox__button" data-lightbox-next aria-label="下一张图片">›</button>',
        '  <button type="button" class="article-lightbox__button article-lightbox__button--close" data-lightbox-close aria-label="关闭图片预览">×</button>',
        '</div>'
    ].join('');
    document.body.appendChild(overlay);

    var preview = overlay.querySelector('.article-lightbox__image');
    var counter = overlay.querySelector('.article-lightbox__counter');
    var prevButton = overlay.querySelector('[data-lightbox-prev]');
    var nextButton = overlay.querySelector('[data-lightbox-next]');
    var closeButton = overlay.querySelector('.article-lightbox__button--close');
    var hasMultiple = images.length > 1;

    prevButton.hidden = !hasMultiple;
    nextButton.hidden = !hasMultiple;

    function imageSource(img) {
        return img.getAttribute('data-lightbox-src') || img.currentSrc || img.src;
    }

    function show(index) {
        currentIndex = (index + images.length) % images.length;
        var source = images[currentIndex];
        preview.src = imageSource(source);
        preview.alt = source.alt || '';
        counter.textContent = hasMultiple
            ? (currentIndex + 1) + ' / ' + images.length
            : '';
    }

    function open(index) {
        window.clearTimeout(closeTimer);
        previousFocus = document.activeElement;
        show(index);
        overlay.hidden = false;
        document.body.classList.add('article-lightbox-open');
        window.requestAnimationFrame(function () {
            overlay.classList.add('is-open');
            closeButton.focus();
        });
    }

    function close() {
        overlay.classList.remove('is-open');
        document.body.classList.remove('article-lightbox-open');

        var focusTarget = previousFocus;
        previousFocus = null;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus();
        }

        closeTimer = window.setTimeout(function () {
            if (overlay.classList.contains('is-open')) return;
            overlay.hidden = true;
            preview.removeAttribute('src');
        }, 220);
    }

    images.forEach(function (img, index) {
        img.classList.add('is-zoomable');
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', img.alt ? '查看大图：' + img.alt : '查看大图');

        img.addEventListener('click', function (event) {
            event.preventDefault();
            open(index);
        });

        img.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            open(index);
        });
    });

    overlay.querySelectorAll('[data-lightbox-close]').forEach(function (element) {
        element.addEventListener('click', close);
    });

    prevButton.addEventListener('click', function () {
        show(currentIndex - 1);
    });

    nextButton.addEventListener('click', function () {
        show(currentIndex + 1);
    });

    document.addEventListener('keydown', function (event) {
        if (!overlay.classList.contains('is-open')) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (hasMultiple && event.key === 'ArrowLeft') {
            event.preventDefault();
            show(currentIndex - 1);
        } else if (hasMultiple && event.key === 'ArrowRight') {
            event.preventDefault();
            show(currentIndex + 1);
        }
    });

    overlay.addEventListener('keydown', function (event) {
        if (event.key !== 'Tab') return;

        var focusable = [prevButton, nextButton, closeButton].filter(function (button) {
            return !button.hidden;
        });
        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
})();
