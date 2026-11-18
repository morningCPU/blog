(function () {
    'use strict';

    var content = document.querySelector('.article-content');
    if (!content) return;

    var checkboxes = Array.prototype.slice.call(
        content.querySelectorAll('input[type="checkbox"]')
    );
    if (!checkboxes.length) return;

    var storageKey = 'article-checklist:' + window.location.pathname;
    var state = {};

    try {
        state = JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {};
    } catch (error) {
        state = {};
    }

    function hashText(value) {
        var hash = 2166136261;
        for (var i = 0; i < value.length; i += 1) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function itemFor(checkbox) {
        return checkbox.closest('li');
    }

    function labelFor(checkbox) {
        var item = itemFor(checkbox);
        return (item ? item.textContent : '').trim().replace(/\s+/g, ' ');
    }

    function keyFor(checkbox, index) {
        var label = labelFor(checkbox);
        return label ? hashText(label) : 'item-' + index;
    }

    function syncItem(checkbox) {
        var item = itemFor(checkbox);
        if (item) item.classList.toggle('is-checked', checkbox.checked);
    }

    function saveState() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
            // Checklist remains usable when storage is unavailable.
        }
    }

    checkboxes.forEach(function (checkbox, index) {
        var key = keyFor(checkbox, index);
        var label = labelFor(checkbox);

        checkbox.disabled = false;
        checkbox.removeAttribute('disabled');
        checkbox.classList.add('article-checklist-checkbox');
        checkbox.checked = Boolean(state[key]);

        if (label) checkbox.setAttribute('aria-label', '标记完成：' + label);

        syncItem(checkbox);

        checkbox.addEventListener('change', function () {
            state[key] = checkbox.checked;
            syncItem(checkbox);
            saveState();
        });
    });
})();
