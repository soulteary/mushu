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

scrollPageToBottom();
