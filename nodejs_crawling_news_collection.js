const http = require('http');
const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;
const days = new Date().getDate();
const tdays = `${year}-${String(month).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
const selectArr = new Set();

const options = {
    cnn: {
        uri: 'https://lite.cnn.com/en',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    pornhub: {
        uri: 'https://www.pornhub.com/',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    sohu: {
        uri: 'https://business.sohu.com/',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    netease: {
        uri: 'https://money.163.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    tencent: {
        url: 'https://i.news.qq.com/trpc.qqnews_web.kv_srv.kv_srv_http_proxy/list?sub_srv_id=finance&srv_id=pc&offset=0&limit=100&strategy=1&ext={"pool":["hot"],"is_filter":2,"check_type":true}',
    }
};

async function fetchData(url, headers) {
    try {
        const body = await request({ uri: url, headers });
        return body;
    } catch (error) {
        console.error(`Error fetching data from ${url}: ${error.message}`);
        return null;
    }
}

async function scrapeData() {
    const cnnData = await fetchData(options.cnn.uri, options.cnn.headers);
    if (cnnData) {
        const $ = cheerio.load(cnnData);
        $('.tabcontent ul li a').each(function() {
            selectArr.add(`<a href="${$(this).attr('href')}"><li><span>【CNN】</span>${$(this).text()}</li></a>`);
        });
    }

    const pornhubData = await fetchData(options.pornhub.uri, options.pornhub.headers);
    if (pornhubData) {
        const $ = cheerio.load(pornhubData);
        $('.title a').each(function() {
            selectArr.add(`<a href="${$(this).attr('href')}"><li><span>【Pornhub】</span>${$(this).text()}</li></a>`);
        });
    }

    const sohuData = await fetchData(options.sohu.uri, options.sohu.headers);
    if (sohuData) {
        const $ = cheerio.load(sohuData);
        $('#block4 a').each(function() {
            selectArr.add(`<a href="${$(this).attr('href')}"><li><span>【Sohu】</span>${$(this).text()}</li></a>`);
        });
    }

    const neteaseData = await fetchData(options.netease.uri, options.netease.headers);
    if (neteaseData) {
        const $ = cheerio.load(neteaseData);
        $('.tab_content h2 a, .topnews_nlist2 h3 a').each(function() {
            selectArr.add(`<a href="${$(this).attr('href')}"><li><span>【Neetease】</span>${$(this).text()}</li></a>`);
        });
    }

    const tencentData = await fetchData(options.tencent.url);
    if (tencentData) {
        const data = JSON.parse(tencentData);
        data.data.list.forEach(item => {
            selectArr.add(`<a href="${item.url}"><li><span>【Tencent】</span>${item.title}</li></a>`);
        });
    }
}

async function saveToFile() {
    const currentDate = new Date();
    const timeString = currentDate.toTimeString().split(' ')[0];
    const content = `<h1>News Collection</h1><h4 style="margin-bottom:10px;">Total：${selectArr.size}  Update：${timeString}</h4>` + Array.from(selectArr).reverse().join("");
    
    fs.writeFileSync(`${tdays}.html`, content, { encoding: 'utf8' });
}

setInterval(async () => {
    await scrapeData();
    await saveToFile();
}, 5000);

http.createServer(async (req, res) => {
    fs.readFile(`${tdays}.html`, (err, data) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        if (err) {
            res.end('Error loading page');
            return;
        }
        res.end(data);
    });
}).listen(43219, () => {
    console.log('Server running at http://localhost:43219/');
});
