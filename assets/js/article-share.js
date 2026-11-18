(function () {
    "use strict";

    function copyFallback(text) {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-1000px";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        var copied = false;
        try {
            copied = document.execCommand("copy");
        } catch (error) {
            copied = false;
        }
        document.body.removeChild(area);
        return copied;
    }

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).catch(function () {
                return new Promise(function (resolve, reject) {
                    if (copyFallback(text)) {
                        resolve();
                    } else {
                        reject(new Error("copy failed"));
                    }
                });
            });
        }
        return new Promise(function (resolve, reject) {
            if (copyFallback(text)) {
                resolve();
            } else {
                reject(new Error("copy failed"));
            }
        });
    }

    Array.prototype.forEach.call(
        document.querySelectorAll("[data-share-root]"),
        function (root) {
            var url = root.getAttribute("data-share-url");
            var title = root.getAttribute("data-share-title");
            var feedback = root.querySelector("[data-share-feedback]");
            var copyButton = root.querySelector("[data-share-copy]");
            var copyLabel = root.querySelector("[data-copy-label]");
            var nativeButton = root.querySelector("[data-share-native]");
            var feedbackTimer;
            var copyTimer;

            function setFeedback(message, isError) {
                if (!feedback) {
                    return;
                }
                window.clearTimeout(feedbackTimer);
                feedback.textContent = message;
                feedback.classList.add("is-visible");
                feedback.setAttribute("data-state", isError ? "error" : "ok");
                feedbackTimer = window.setTimeout(function () {
                    feedback.classList.remove("is-visible");
                }, 2800);
            }

            if (copyButton) {
                copyButton.addEventListener("click", function () {
                    copyText(url).then(function () {
                        setFeedback("链接已复制到剪贴板。", false);
                        if (copyLabel) {
                            window.clearTimeout(copyTimer);
                            copyLabel.textContent = "已复制";
                            copyTimer = window.setTimeout(function () {
                                copyLabel.textContent = "复制链接";
                            }, 1800);
                        }
                    }).catch(function () {
                        setFeedback("复制失败，请手动复制地址栏链接。", true);
                    });
                });
            }

            if (nativeButton && typeof navigator.share === "function") {
                nativeButton.hidden = false;
                nativeButton.addEventListener("click", function () {
                    navigator.share({
                        title: title,
                        text: title,
                        url: url
                    }).catch(function (error) {
                        if (!error || error.name !== "AbortError") {
                            setFeedback("系统分享未完成，可尝试复制链接。", true);
                        }
                    });
                });
            }
        }
    );
})();
