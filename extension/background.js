const DEFAULT_REPORT_SERVER = "http://localhost:8080/Exchange";
let ConnReady = false;
let Mutex = false;

/*! --------------------------------
// Simple Execution Process
-------------------------------- */

AppInit()
  .then(function (config) {
    if (!config) {
      Exchange(DEFAULT_REPORT_SERVER, "fail to fetch the config");
      return;
    }

    const { job, server, report, base, min, max } = config;
    let conn = CreateWebsocketConn(server, report);

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
    Exchange(DEFAULT_REPORT_SERVER, "fail to fetch the config");
  });

/*! --------------------------------
// example task
-------------------------------- */

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
      ReloadPage(job, function (data) {
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

/*! --------------------------------
// browser, extension, server... comminicates
-------------------------------- */

/**
 * Init the extension app after fetching the config
 * @returns
 */
async function AppInit() {
  const config = await Exchange("http://localhost:8080/config");
  return config && config.code == 200 ? config.data : null;
}

function BootStrap(conn, job, base, min, max) {
  // reload the page, auto renew the session
  let w = watchdog(conn, job, base, min, max);
  setInterval(w, 1000);

  // eg, stats report
  let s = stats(conn);
  setInterval(s, 1000);

  // eg, inject code, scroll the page to bottom...
  setInterval(function () {
    Execute(job, scrollPageToBottom);
  }, 1000);
}

/*! --------------------------------
// chrome functions
-------------------------------- */

/**
 * Execute the given command
 * @param {string} job
 * @param {function} fn
 */
function Execute(job, fn) {
  chrome.tabs.query({ url: job }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: fn }).then((injectionResults) => {
        for (const frameResult of injectionResults) {
          const { frameId, result } = frameResult;
          console.log(`Frame #${frameId} 执行结果:`, result);
        }
      });
    });
  });
}

/**
 * Reload the chrome tab which matches the job url
 * @param {string} server
 * @param {function} callback
 */
function ReloadPage(server, callback) {
  chrome.tabs.query({ url: server }, function (tabs) {
    tabs.forEach(function (tab) {
      chrome.tabs.reload(tab.id);
      callback("重载完毕");
    });
  });
}

/*! --------------------------------
// network connection
-------------------------------- */

/**
 * Data Exchange with the server
 * ref: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
 * @param {string} url
 * @param {object} data
 * @returns
 */
async function Exchange(url = "", data = {}) {
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

/**
 * Create a connection to a remote server
 * @param {string} server
 * @param {string} report
 * @returns
 */
function CreateWebsocketConn(server, report) {
  var conn = new WebSocket(server);
  conn.onclose = function (evt) {
    console.log(evt);
    Exchange(report, "Connection closed.");
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

/*! --------------------------------
// utils, injected functions...
-------------------------------- */

/**
 * Make interaction times somewhat random
 * @param {int} base
 * @param {int} min
 * @param {int} max
 * @returns
 */
function getRandomDelay(base, min, max) {
  return base + Math.floor(Math.random() * min) + max;
}

/**
 * Scroll the page to bottom
 * @returns void
 */
async function scrollPageToBottom() {
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
