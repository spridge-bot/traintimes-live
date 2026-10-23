// Delays, written the same way on every page: "+2 min" late, "−2 min early".
//
//   delayLabel(2)   -> "+2 min"
//   delayLabel(-2)  -> "−2 min early"
//   delayLabel(0)   -> "On time"
(function () {
  window.delayLabel = function (minutes, onTime = "On time") {
    if (minutes == null) return "";
    if (minutes === 0) return onTime;
    return minutes > 0 ? `+${minutes} min` : `−${-minutes} min early`;
  };
})();
