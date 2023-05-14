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
  // let w = watchdog(conn, job, report, base, min, max);
  // setInterval(w, 1000);

  // init tabs id cache
  setInterval(function () {
    initTabsCache(job);
  }, 1000);

  // eg, stats report
  let s = stats(conn, report);
  setInterval(s, 5000);

  // eg, inject code, scroll the page to bottom...
  // setInterval(function () {
  // ExecuteAll(job, "scroll.js", true);
  // }, 1000);
}

/*! --------------------------------
// chrome functions
-------------------------------- */

/**
 * Init the Chrome tabs ID cache
 * @param {string} job
 * @returns void
 */
function initTabsCache(job) {
  chrome.tabs.query({ url: job }, function (tabs) {
    tabs.forEach(function (tab) {
      TabIdCache = {};
      TabIdCache[tab.id] = job;
    });
  });
}

/**
 * Execute the given command
 * @param {string} job
 * @param {function} fn
 */
function ExecuteAll(job, fn, isFile) {
  chrome.tabs.query({ url: job }, function (tabs) {
    tabs.forEach(function (tab) {
      TabIdCache = {};
      TabIdCache[tab.id] = job;

      if (isFile) {
        ExecuteByID([tab.id], { isCommand: true, file: fn });
      } else {
        let data = checkCommand(fn);
        if (!data.isCommand) return;
        ExecuteByID([tab.id], data);
      }
    });
  });
}

const MUSHU_ACTION = {
  CLICK: "click",
  SCROLL: "scroll",
  RELOAD: "reload",
  DOCUMENT: "document",
};

let COMMAND_REGEXP = /^(\[!MUSHU:.+?\])(.*)/;
function checkCommand(message) {
  let payload = message + "";
  if (!payload.startsWith("[!MUSHU:")) {
    console.log(message);
    return { isCommand: false, message: message };
  }
  let [, command, content] = COMMAND_REGEXP.exec(message);
  command = command.toUpperCase().trim();
  content = content.trim();
  switch (command) {
    case "[!MUSHU:CLICK]":
      return { isCommand: true, action: MUSHU_ACTION.CLICK, content: content };
    case "[!MUSHU:SCROLL]":
      return { isCommand: true, action: MUSHU_ACTION.SCROLL, file: "scroll.js" };
    case "[!MUSHU:RELOAD]":
      return { isCommand: true, action: MUSHU_ACTION.RELOAD };
    case "[!MUSHU:DOCUMENT]":
      return { isCommand: true, action: MUSHU_ACTION.DOCUMENT };
    default:
      console.log(command, message);
      return { isCommand: false, message: message };
  }
}

function ExecuteByID(tabIDs, command) {
  console.log("[ExecuteByID]", tabIDs, command);
  let details = { allFrames: false };

  switch (command.action) {
    case MUSHU_ACTION.CLICK:
      details.code = `document.querySelector("${command.content}").click()`;
      break;
    case MUSHU_ACTION.SCROLL:
      details.file = command.file;
      break;
    case MUSHU_ACTION.RELOAD:
      tabIDs.forEach(function (tabID) {
        chrome.tabs.reload(Number(tabID));
      })
      details.code = `winow.location.reload()`;
      break;
    case MUSHU_ACTION.DOCUMENT:
      details.code = "document.documentElement.outerHTML";
      break;
    default:
      if (command.file) {
        details.file = command.file;
      } else {
        if (!content) {
          return;
        }
        details.code = content;
      }
      break;
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
    let data = checkCommand(message);
    if (!data.isCommand) return;
    console.log(Object.keys(TabIdCache));
    ExecuteByID(Object.keys(TabIdCache), data);
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
