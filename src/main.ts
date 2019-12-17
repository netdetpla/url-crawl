import fs = require("fs");
import puppeteer = require("puppeteer");

import {Url} from "./url";
import {Log} from "./log";

function url2Domain(url: string): string {
    let httpsRegex = "^https";
    if (url.match(httpsRegex)) {
        return url.slice(8).split("/")[0]
    } else {
        return url.slice(7).split("/")[0]
    }
}

function init() {
    if (!fs.existsSync("/tmp/appstatus/")) {
        fs.mkdirSync("/tmp/appstatus/", {});
    }
    if (!fs.existsSync("/tmp/result/")) {
        fs.mkdirSync("/tmp/result/", {})
    }
}

function parseParam(): Url[] {
    let param = fs.readFileSync("/tmp/conf/busi.conf", "utf8");
    let urls: Url[];
    urls = [];
    let tasks = param.split(",");
    for (let i = 0; i < tasks.length; i++) {
        urls.push(new Url(tasks[i]));
    }
    Log.debug("params: ");
    Log.debug(param);
    return urls;
}

async function execute(urls: Url[]): Promise<string[]> {
    let browser = await puppeteer.launch({
        devtools: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
        executablePath: "/usr/bin/chromium"
    });
    try {
        let domains = [];

        for (let i = 0; i < urls.length; i++) {
            let page = await browser.newPage();

            await page.goto(urls[i].url, {timeout: 10 * 1000});
            await page.waitFor(1000);
            const result = await page.evaluate(() => {
                let urlSet = [];
                let elements = document.querySelectorAll("a[href]");
                for (let i = 0; i < elements.length; i++) {
                    urlSet.push(elements[i].getAttribute("href"));
                }
                return urlSet;
            });
            await page.close();
            let regex = "^http.*";
            for (let i = 0; i < result.length; i++) {
                if (result[i].match(regex)) {
                    domains.push(url2Domain(result[i]));
                }
            }
        }
        return [...new Set(domains)];
    } catch (e) {
        Log.error(e.stack);
        errorEnd(e.toString(), 11);
    } finally {
        await browser.close();
    }
}

function writeResult(domains: string[]) {
    Log.info("writing result file");
    try {
        fs.writeFileSync("/tmp/result/result", domains.join(","));
    } catch (e) {
        Log.error(e.stack);
        errorEnd(e.toString(), 11);
    }
}

function successEnd() {
    fs.writeFileSync("/tmp/appstatus/" + "0", "");
}

function errorEnd(message: string, code: number) {
    fs.writeFileSync("/tmp/appstatus/" + "1", message);
    process.exit(code);
}

init();
Log.info("url-crawl start");
// 获取配置
let urls = parseParam();
// 执行
Log.info("spider start");
execute(urls).then((domains) => {
    Log.info("spider end");
    writeResult(domains);
    successEnd();
    Log.info("url-crawl end successfully");
});
