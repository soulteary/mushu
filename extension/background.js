const DEFAULT_REPORT_SERVER = "http://localhost:8080/exchange";
let ConnReady = false;
let Mutex = false;

async function exchange(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(data),
  });
  return response.json();
}

async function AppInit() {
  const config = await exchange("http://localhost:8080/config");
  return config && config.code == 200 ? config.data : null;
}

function GetWebsocketConn(server, report) {
  var conn = new WebSocket(server);
  conn.onclose = function (evt) {
    console.log(evt);
    exchange(report, "Connection closed.");
    ConnReady = false;
  };
  conn.onmessage = function (evt) {
    var messages = evt.data.split("\n");
    for (var i = 0; i < messages.length; i++) {
      console.log(messages[i]);
    }
  };
  conn.onopen = function () {
    ConnReady = true;
  };
  return conn;
}

// scroll page to bottom
async function scrollToBottom() {
  return new Promise((resolve) => {
    let totalHeight = 0;
    let distance = 500;
    let timer = setInterval(() => {
      let scrollHeight = document.body.scrollHeight;
      window.scrollBy(0, distance);
      totalHeight += distance;
      if (totalHeight >= scrollHeight) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
}

// Make interaction times somewhat random
function getRandomDelay(base, min, max) {
  return base + Math.floor(Math.random() * min) + max;
}

// Continuously create tasks
function watchdog(conn, job, baseTime, minTime, maxTime) {
  return function () {
    if (Mutex) return;
    // delay execution after
    var delay = getRandomDelay(baseTime, minTime, maxTime) * 1000;
    Mutex = true;
    conn.send("创建延时任务:" + delay);
    setTimeout(function () {
      Mutex = false;
      reloadPage(job, function (data) {
        conn.send("页面重载执行结果" + data);
      });
    }, delay);
  };
}

// Continuously collect data
function stats(conn) {
  return function () {
    conn.send("stats ok");
  };
}

function reloadPage(server, callback) {
  chrome.tabs.query({ url: server }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.tabs.reload(tab.id);
      callback("true");
    });
  });
}

function inject(job, fn) {
  chrome.tabs.query({ url: job }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: fn }).then((injectionResults) => {
        for (const frameResult of injectionResults) {
          const { frameId, result } = frameResult;
          console.log(`Frame ${frameId} result:`, result);
        }
      });
    });
  });
}

function BootStrap(conn, job, base, min, max) {
  // reload the page, auto renew the session
  let w = watchdog(conn, job, base, min, max);
  setInterval(w, 1000);

  // eg, stats report
  let s = stats(conn);
  setInterval(s, 1000);

  setInterval(function () {
    inject(job, scrollToBottom);
  }, 1000);
}

AppInit()
  .then(function (config) {
    if (!config) {
      exchange(DEFAULT_REPORT_SERVER, "fail to fetch the config");
      return;
    }

    const { job, server, report, base, min, max } = config;
    let conn = GetWebsocketConn(server, report);

    let connChecker = setInterval(function () {
      console.log(ConnReady);
      if (ConnReady) {
        clearInterval(connChecker);
        BootStrap(conn, job, base, min, max);
        return;
      }
    }, 500);
  })
  .catch(function (err) {
    console.log(err);
    exchange(DEFAULT_REPORT_SERVER, "fail to fetch the config");
  });
