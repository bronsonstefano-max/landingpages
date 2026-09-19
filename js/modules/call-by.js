/**
 * "Call by {time}" urgency line — always at least 2 hours ahead of the
 * visitor's local clock, rounded up to the next whole hour (e.g. 3:00PM now
 * shows "Call by 5PM"; 3:15PM shows "Call by 6PM"). Recomputed once a
 * minute so a long-open tab doesn't go stale.
 */

const CALL_BY_OFFSET_MS = 2 * 60 * 60 * 1000;
const UPDATE_INTERVAL_MS = 60 * 1000;

function formatCallByTime(date) {
  let hours = date.getHours();
  if (date.getMinutes() > 0) hours += 1;
  hours = hours % 24;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return displayHours + period;
}

export function initCallByTime() {
  const targets = document.querySelectorAll("[data-call-by-time]");
  if (!targets.length) return;

  const update = () => {
    const text = formatCallByTime(new Date(Date.now() + CALL_BY_OFFSET_MS));
    targets.forEach((el) => {
      el.textContent = text;
    });
  };

  update();
  setInterval(update, UPDATE_INTERVAL_MS);
}
