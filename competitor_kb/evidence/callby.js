(function () {
    function roundUpToNextHalfHour(date) {
        var rounded = new Date(date);
        var minutes = rounded.getMinutes();

        if (minutes > 0 && minutes <= 30) {
            rounded.setMinutes(30, 0, 0);
        } else if (minutes > 30) {
            rounded.setHours(rounded.getHours() + 1);
            rounded.setMinutes(0, 0, 0);
        }

        return rounded;
    }

    function formatTime(date) {
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        }).replace(" ", "");
    }

    function updateServiceCallMessage() {
        var messageEl = document.getElementById("call-by-service-message");
        if (!messageEl) return;

        var now = new Date();

        var callBy = new Date(now);
        callBy.setHours(callBy.getHours() + 1);

        var roundedCallBy = roundUpToNextHalfHour(callBy);

        var serviceText = now.getHours() >= 18
            ? "for Priority Next-Day Service"
            : "for Service Today or Priority Next-Day Service";

        messageEl.textContent =
            "Call by " +
            formatTime(roundedCallBy) +
            " " +
            serviceText;
    }

    updateServiceCallMessage();
    setInterval(updateServiceCallMessage, 60000);
})();
