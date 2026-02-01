const http = require('http');
const request = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');

const options = {
    cnn: {
        url: 'https://lite.cnn.com/en',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    sohu: {
        url: 'https://business.sohu.com/',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    netease: {
        url: 'https://money.163.com',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    weibo: {
        url: 'https://apis.tianapi.com/weibohot/index?key=33a5fa31f1bdc51d0db7494b0538f13d',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest', // 模拟AJAX请求
        }
    },
    zhihu: {
        url: 'https://api.zhihu.com/topstory/hot-lists/total'
    },
    toutiao: {
        url: 'https://www.toutiao.com/api/pc/feed/?category=news_hot'
    },
    tencent: {
        url: 'https://i.news.qq.com/gw/event/pc_hot_ranking_list',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
    jisilu: {
        url: 'https://www.jisilu.cn/explore/',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
        }
    },
};

async function fetchData(url, headers) {
    try {
        const body = await request({ url: url, headers });
        return body;
    } catch (error) {
        console.error(`Error fetching data from ${url}: ${error.message}`);
        return null;
    }
}

async function scrapeData() {
    let selectArr = [];
    const cnnData = await fetchData(options.cnn.url, options.cnn.headers);
    if (cnnData) {
        const $ = cheerio.load(cnnData);
        $('.tabcontent ul li a').each(function() {
            selectArr.push({
                logo: 'cnn',
                title: $(this).text(),
                url: options.cnn.url.slice(0, -3) + $(this).attr('href')
            })
        });
    }

    const sohuData = await fetchData(options.sohu.url, options.sohu.headers);
    if (sohuData) {
        const $ = cheerio.load(sohuData);
        $('#block4 a').each(function() {
            selectArr.push({
                logo: 'sohu',
                title: $(this).text(),
                url: $(this).attr('href').indexOf("sohu.com") > -1 ? $(this).attr('href') : options.sohu.url.slice(0, -1) + $(this).attr('href')
            })
        });
    }

    const neteaseData = await fetchData(options.netease.url, options.netease.headers);
    if (neteaseData) {
        const $ = cheerio.load(neteaseData);
        $('.tab_content h2 a, .topnews_nlist2 h3 a').each(function() {
            selectArr.push({
                logo: 'netease',
                title: $(this).text(),
                url: $(this).attr('href')
            })
        });
    }

    const tencentData = await fetchData(options.tencent.url);
    if (tencentData) {
        const data = JSON.parse(tencentData);
        data.idlist[0].newslist.forEach(item => {
            selectArr.push({
                logo: 'tencent',
                title: item.title,
                url: item.url
            })
        });
    }
    const weiboData = await fetchData(options.weibo.url, options.weibo.headers);
    if (weiboData) {
        const data = JSON.parse(weiboData);
        data.result.list.forEach(item => {
            selectArr.push({
                logo: 'weibo',
                title: item.hotword,
                url: ''
            })
        });
    }
    const zhihuData = await fetchData(options.zhihu.url);
    if (zhihuData) {
        const data = JSON.parse(zhihuData);
        data.data.forEach(item => {
            selectArr.push({
                logo: 'zhihu',
                title: item.target.title,
                url: `${`https://www.zhihu.com/question/` + item.target.id}`
            })
        });
    }
    const toutiaoData = await fetchData(options.toutiao.url);
    if (toutiaoData) {
        const data = JSON.parse(toutiaoData);
        data.data.forEach(item => {
            selectArr.push({
                logo: 'toutiao',
                title: item.title,
                url: item.source_url
            })
        });
    }
    const jisiluData = await fetchData(options.jisilu.url);
    if (jisiluData) {
        const $ = cheerio.load(jisiluData);
        $('.aw-content-wrap .aw-item h4>a:nth-child(1)').each(function() {
            selectArr.push({
                logo: 'jisilu',
                title: $(this).text(),
                url: $(this).attr('href')
            })
        });
    }

    return selectArr.sort((a, b) => a.title.length - b.title.length);
}

let cachedNewsData = [];
let lastUpdateTime = null;

async function refreshData() {
    console.log('Refreshing news data...');
    try {
        const news = await scrapeData();
        if (news) {
            cachedNewsData = news;
            lastUpdateTime = new Date().toTimeString().split(' ')[0];
        }
        console.log('News data refreshed successfully.');
    } catch (error) {
        console.error('Failed to refresh news data:', error);
    }
}
setInterval(refreshData, 3600000);
refreshData();

http.createServer((req, res) => {
    if (req.url === '/') {
        const newsListHTML = cachedNewsData.map(item => `
            <li><a href="${item.url}" target="_blank">
                <span class="logo">【${item.logo.slice(0, 1).toUpperCase() + item.logo.slice(1).toLowerCase()}】</span>${item.title}
            </a></li>
        `).join("");

        const content = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f7fc;
                        color: #333;
                        margin: 0;
                        padding: 0;
                        transition: background-color 0.3s, color 0.3s;
                    }
                    a {
                        text-decoration: none;
                        color: inherit;
                        transition: color 0.3s;
                    }
                    ul {
                        list-style: none;
                        padding: 0;
                        margin: 20px auto;
                        max-width: 800px;
                    }
                    li {
                        margin: 10px 0;
                        padding: 10px;
                        background: #fff;
                        border-radius: 8px;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                        transition: transform 0.2s, box-shadow 0.3s;
                    }
                    li:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                    }
                    .logo {
                        font-weight: bold;
                        color: #6c63ff;
                        margin-right: 5px;
                    }
                    .title {
                        width: 100%;
                        text-align: center;
                        color: #fff;
                        background-color: #6c63ff;
                        padding: 20px 0;
                        font-size: 1.5em;
                        font-weight: bold;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        max-width: 800px;
                        margin: 20px auto;
                        padding: 0 10px;
                    }
                    h4 {
                        margin: 0;
                        color: #555;
                    }
                    .search-bar {
                        margin: 20px auto;
                        max-width: 800px;
                        display: flex;
                        align-items: center;
                    }
                    .search-bar input {
                        width: 100%;
                        padding: 10px;
                        font-size: 16px;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        transition: background-color 0.3s, color 0.3s;
                    }
                    .search-bar input:focus {
                        outline: none;
                        border-color: #6c63ff;
                        box-shadow: 0 0 5px rgba(108, 99, 255, 0.5);
                    }
                    #darkModeToggle {
                        padding: 10px 15px;
                        font-size: 14px;
                        color: #fff;
                        background-color: #6c63ff;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: background-color 0.3s, transform 0.2s;
                    }
                    #darkModeToggle:hover {
                        background-color: #574fd1;
                        transform: translateY(-2px);
                    }
                    .dark-mode {
                        background-color: #121212;
                        color: #ffffff;
                    }
                    .dark-mode a {
                        color: #90caf9;
                    }
                    .dark-mode li {
                        background-color: #1e1e1e;
                        color: #ffffff;
                        box-shadow: 0 2px 5px rgba(255, 255, 255, 0.1);
                    }
                    .dark-mode li:hover {
                        box-shadow: 0 4px 10px rgba(255, 255, 255, 0.2);
                    }
                    .dark-mode input {
                        background-color: #1e1e1e;
                        color: #ffffff;
                        border-color: #ffffff;
                    }
                    .no-results {
                        text-align: center;
                        color: #999;
                        margin: 20px 0;
                        font-size: 1.2em;
                    }
                    .back-to-top {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background-color: #6c63ff;
                        color: #fff;
                        border: none;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        font-size: 18px;
                        cursor: pointer;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                        transition: background-color 0.3s, transform 0.2s;
                    }
                    .back-to-top:hover {
                        background-color: #574fd1;
                        transform: scale(1.1);
                    }
                    .back-to-top.hidden {
                        display: none;
                    }
                </style>
            </head>
            <body>
                <div class="title">
                    News Collection
                </div>
                <div class="header">
                    <h4>Total: ${cachedNewsData.length} | Last Update: ${lastUpdateTime}</h4>
                    <button id="darkModeToggle">Toggle Dark Mode</button>
                </div>
                <div class="search-bar">
                    <input type="text" id="searchInput" placeholder="Please Search with Keywords...">
                </div>
                <ul id="newsList">${newsListHTML}</ul>
                <div class="no-results" id="noResults" style="display: none;">There is Nothing...</div>
                <button id="backToTop" class="back-to-top hidden">↑</button>
                <script>
                    document.getElementById('darkModeToggle').addEventListener('click', function () {
                        document.body.classList.toggle('dark-mode');
                    });

                    const searchInput = document.getElementById('searchInput');
                    const newsList = ${JSON.stringify(cachedNewsData.map(item => ({
                        html: `<li><a href="${item.url}" target="_blank"><span class="logo">【${item.logo.slice(0, 1).toUpperCase() + item.logo.slice(1).toLowerCase()}】</span>${item.title}</a></li>`,
                        title: item.title.toLowerCase(),
                        logo: item.logo
                    })))};

                    const newsListContainer = document.getElementById('newsList');
                    const noResults = document.getElementById('noResults');

                    searchInput.addEventListener('input', function () {
                        const keyword = this.value.toLowerCase();
                        const filteredNews = newsList.filter(item => item.title.includes(keyword) || item.logo.toLowerCase().indexOf(keyword) > -1);

                        if (filteredNews.length === 0) {
                            noResults.style.display = 'block';
                            newsListContainer.innerHTML = '';
                        } else {
                            noResults.style.display = 'none';
                            newsListContainer.innerHTML = filteredNews.map(item => item.html).join('');
                        }
                    });

                    const backToTopButton = document.getElementById('backToTop');
                    window.addEventListener('scroll', function() {
                        if (window.scrollY > 300) {
                            backToTopButton.classList.remove('hidden');
                        } else {
                            backToTopButton.classList.add('hidden');
                        }
                    });
                    backToTopButton.addEventListener('click', function() {
                        window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    });
                </script>
            </body>
            </html>
        `;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(content);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}).listen(43219, () => {
    console.log('Server running at http://localhost:43219/');
});