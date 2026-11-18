(function () {
    "use strict";

    function copyFallback(text) {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "0";
        area.style.left = "0";
        area.style.width = "1px";
        area.style.height = "1px";
        area.style.padding = "0";
        area.style.border = "0";
        area.style.opacity = "0";
        area.style.pointerEvents = "none";
        document.body.appendChild(area);
        area.focus();
        area.select();
        area.setSelectionRange(0, area.value.length);
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
            var feedback = root.querySelector("[data-share-feedback]");
            var copyButton = root.querySelector("[data-share-copy]");
            var copyLabel = root.querySelector("[data-copy-label]");
            var copyImageButton = root.querySelector("[data-copy-image]");
            var copyImageLabel = root.querySelector("[data-card-copy-label]");
            var feedbackTimer;
            var copyTimer;
            var copyImageTimer;

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
                        setFeedback("浏览器阻止了剪贴板访问，请从地址栏复制链接。", true);
                    });
                });
            }

            if (copyImageButton) {
                copyImageButton.addEventListener("click", function () {
                    var cardUrl = copyImageButton.getAttribute("data-card-url");
                    if (!window.isSecureContext || !navigator.clipboard
                        || !window.ClipboardItem) {
                        setFeedback("当前浏览器不支持图片剪贴板，请打开卡片预览后复制图片。", true);
                        return;
                    }
                    var pngBlobPromise = fetch(cardUrl, { cache: "no-store" })
                        .then(function (response) {
                            if (!response.ok) {
                                throw new Error("card request failed");
                            }
                            return response.blob();
                        })
                        .then(function (blob) {
                            var pngBlob = blob.type === "image/png"
                                ? blob
                                : new Blob([blob], { type: "image/png" });
                            return pngBlob;
                        });
                    var item;
                    try {
                        item = new ClipboardItem({ "image/png": pngBlobPromise });
                    } catch (error) {
                        setFeedback("当前浏览器不支持图片剪贴板，请打开卡片预览后复制图片。", true);
                        return;
                    }
                    navigator.clipboard.write([item])
                        .then(function () {
                            setFeedback("分享卡片已复制到剪贴板。", false);
                            if (copyImageLabel) {
                                window.clearTimeout(copyImageTimer);
                                copyImageLabel.textContent = "已复制";
                                copyImageTimer = window.setTimeout(function () {
                                    copyImageLabel.textContent = "复制卡片";
                                }, 1800);
                            }
                        })
                        .catch(function (error) {
                            if (window.console && window.console.warn) {
                                window.console.warn("Copy share card failed:", error);
                            }
                            setFeedback("复制卡片失败，请打开卡片预览后右键复制图片。", true);
                        });
                });
            }
        }
    );
})();
