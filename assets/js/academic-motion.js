/* Restrained scroll motion for the academic reading theme. */
(function () {
    "use strict";

    var reduceMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
        return;
    }

    var targets = Array.prototype.slice.call(
        document.querySelectorAll("[data-reveal]")
    );
    var widgets = Array.prototype.slice.call(
        document.querySelectorAll(".right-sidebar > *")
    );
    var items = targets.concat(widgets);
    if (!items.length) {
        return;
    }

    function siblingIndex(element) {
        var index = 0;
        var current = element.previousElementSibling;
        while (current) {
            if (current.tagName === element.tagName) {
                index += 1;
            }
            current = current.previousElementSibling;
        }
        return index;
    }

    items.forEach(function (element) {
        var rect = element.getBoundingClientRect();
        var belowFold = rect.top > window.innerHeight * 0.92;
        var delay = 0;

        if (element.matches(".academic-entry, .academic-link-item")) {
            delay = Math.min(siblingIndex(element), 5) * 45;
        } else if (widgets.indexOf(element) !== -1) {
            delay = widgets.indexOf(element) * 55;
        }
        element.style.setProperty("--reveal-delay", delay + "ms");

        if (belowFold) {
            element.classList.add("reveal-pending");
        }
    });

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.06
    });

    items.forEach(function (element) {
        observer.observe(element);
    });
})();
