const DEFAULT_REPORT_SERVER = "http://localhost:8080/Exchange";
let ConnReady = false;
let Mutex = false;
let TabIdCache = {};

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
      if (ConnReady) {
        clearInterval(connChecker);
        BootStrap(conn, job, report, base, min, max);
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
function watchdog(conn, job, report, base, min, max) {
  return function () {
    if (Mutex) return;
    // delay execution after
    var delay = getRandomDelay(base, min, max);
    Mutex = true;
    SendMessage(conn, "创建延时任务:" + delay + "秒后执行", report, true);
    setTimeout(function () {
      Mutex = false;
      ReloadPage(job, function (data) {
        SendMessage(conn, "页面重载执行结果" + data, report, true);
      });
    }, delay * 1000);
  };
}

// Continuously collect data
function stats(conn, report) {
  return function () {
    SendMessage(conn, "stats ok", report, true);
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

function BootStrap(conn, job, report, base, min, max) {
  // reload the page, auto renew the session
  let w = watchdog(conn, job, report, base, min, max);
  setInterval(w, 1000);

  // eg, stats report
  let s = stats(conn, report);
  setInterval(s, 1000);

  // eg, inject code, scroll the page to bottom...
  setInterval(function () {
    ExecuteAll(job, "scroll.js", true);
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
function ExecuteAll(job, fn, isFile) {
  chrome.tabs.query({ url: job }, function (tabs) {
    tabs.forEach(function (tab) {
      TabIdCache = {};
      TabIdCache[tab.id] = true;
      ExecuteByID([tab.id], fn, isFile);
    });
  });
}

function ExecuteByID(tabIDs, fn, isFile) {
  console.log(tabIDs, fn, isFile);
  let details = { allFrames: false };
  if (isFile) {
    details.file = fn;
  } else {
    details.code = fn;
  }
  tabIDs.forEach(function (tabID) {
    chrome.tabs.executeScript(Number(tabID), details, function (result) {
      console.log("执行结果:", result);
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
    var message = (evt.data + "").trim();
    if (!message) return;
    if (message.startsWith("[插件消息]") || message.startsWith("[浏览器消息]")) return;
    console.log(message);

    ExecuteByID(Object.keys(TabIdCache), message);
  };
  conn.onopen = function () {
    ConnReady = true;
  };
  return conn;
}

function SendMessage(conn, message, report, isPlugin) {
  if (ConnReady) {
    if (isPlugin) {
      conn.send("[插件消息] " + message);
    } else {
      conn.send("[浏览器消息] " + message);
    }
  } else {
    Exchange(report, "Connection unexpected interruption.");
  }
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
