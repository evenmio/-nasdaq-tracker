/**
 * nasdaq-tracker 网页服务版
 * 电脑上跑，手机在同一WiFi下访问
 *
 * 用法:
 *   node nasdaq-server.js
 *   手机浏览器打开 http://电脑IP:3000
 */
const http = require('http');
const https = require('https');
const os = require('os');

// 获取局域网IP
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name in ifaces) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// HTML模板（内嵌样式）
const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>纳指弹药追踪</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;background:#0d1117;color:#e6edf3;padding:16px;min-height:100vh}
.card{background:#161b22;border-radius:12px;padding:20px;margin-bottom:12px;border:1px solid #30363d}
h1{font-size:18px;font-weight:600;margin-bottom:4px}
.sub{font-size:13px;color:#8b949e;margin-bottom:16px}
.price-row{display:flex;align-items:baseline;gap:12px;margin-bottom:8px}
.price{font-size:32px;font-weight:700;font-variant-numeric:tabular-nums}
.change{font-size:18px;font-weight:600}
.up{color:#3fb950}
.down{color:#f85149}
.label{font-size:13px;color:#8b949e;margin-bottom:4px}
.verdict{font-size:16px;font-weight:600;padding:12px 16px;border-radius:8px;margin-top:4px}
.trigger{background:rgba(248,81,73,0.15);border:1px solid #f85149;color:#f85149}
.normal{background:rgba(63,185,80,0.1);border:1px solid #3fb950;color:#3fb950}
.hold{background:rgba(139,148,158,0.1);border:1px solid #30363d;color:#8b949e}
.plan-box{background:#0d1117;border-radius:8px;padding:14px;margin-top:10px}
.plan-item{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
.plan-item .val{color:#e6edf3}
.footer{text-align:center;font-size:12px;color:#484f58;margin-top:20px}
.loading{text-align:center;padding:40px 0;color:#8b949e}
.btn{display:block;width:100%;padding:14px;background:#238636;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:12px}
.btn:active{background:#2ea043}
.info-row{display:flex;justify-content:space-between;font-size:13px;color:#8b949e;padding:2px 0}
.highlight{color:#f0883e;font-weight:600}
</style>
</head>
<body>
<div class="card">
  <h1>纳斯达克弹药追踪器</h1>
  <div class="sub">Plan B — 基础180元 + 弹药70元</div>
  <div id="status" class="loading">正在获取数据...</div>
</div>
<div id="detail" style="display:none">
  <div class="card">
    <div class="label">纳斯达克综合指数</div>
    <div class="price-row">
      <span class="price" id="price">--</span>
      <span class="change" id="change">--</span>
    </div>
    <div class="info-row">
      <span>开盘: <span id="open">--</span></span>
      <span>最高: <span id="high">--</span></span>
      <span>最低: <span id="low">--</span></span>
    </div>
    <div class="info-row">
      <span>昨收: <span id="prevClose">--</span></span>
      <span>更新: <span id="updateTime">--</span></span>
    </div>
  </div>
  <div class="card">
    <div class="label">今日操作</div>
    <div id="verdict" class="verdict">--</div>
    <div id="planDetail" class="plan-box" style="display:none">
      <div class="plan-item"><span>总投入</span><span class="val" id="totalAmount">--</span></div>
      <div class="plan-item"><span>大成</span><span class="val" id="dcAmount">--</span></div>
      <div class="plan-item"><span>广发</span><span class="val" id="gfAmount">--</span></div>
      <div class="plan-item"><span>天弘</span><span class="val" id="thAmount">--</span></div>
    </div>
  </div>
  <div class="card">
    <div class="label">定投计划</div>
    <div class="plan-item"><span>基础</span><span class="val">大成30+广发80+天弘70=180元</span></div>
    <div class="plan-item"><span>弹药</span><span class="val">大成+20+广发+20+天弘+30=70元</span></div>
    <div class="plan-item"><span>阈值</span><span class="val">跌超1.5%</span></div>
    <div class="plan-item"><span>满额</span><span class="val highlight">大成50+广发100+天弘100=250元</span></div>
  </div>
</div>
<button class="btn" onclick="location.reload()">刷新</button>
<div class="footer">数据来源: 新浪财经 | 仅供参考</div>
<script>
fetch('/api/data').then(function(r){return r.json()}).then(function(d){
  document.getElementById('status').style.display='none';
  document.getElementById('detail').style.display='block';
  if(d.error){document.getElementById('status').style.display='block';
    document.getElementById('status').textContent='获取失败: '+d.error;return}
  document.getElementById('price').textContent=d.close;
  document.getElementById('open').textContent=d.open;
  document.getElementById('high').textContent=d.high;
  document.getElementById('low').textContent=d.low;
  document.getElementById('prevClose').textContent=d.prevClose;
  document.getElementById('updateTime').textContent=d.time;
  var el=document.getElementById('change');
  el.textContent=(d.pct>=0?'+':'')+d.pct+'%';
  el.className='change '+(d.pct>=0?'up':'down');
  var ve=document.getElementById('verdict');
  var pe=document.getElementById('planDetail');
  if(d.pct<0&&Math.abs(d.pct)>=1.5){
    ve.textContent='⚠️ 触发弹药! 跌了 '+Math.abs(d.pct)+'%';
    ve.className='verdict trigger';
    pe.style.display='block';
    document.getElementById('totalAmount').textContent='250元 (基础180+弹药70)';
    document.getElementById('dcAmount').textContent='50元';
    document.getElementById('gfAmount').textContent='100元';
    document.getElementById('thAmount').textContent='100元';
  }else if(d.pct<0){
    ve.textContent='跌 '+Math.abs(d.pct)+'%，未达阈值';
    ve.className='verdict hold';
    pe.style.display='block';
    document.getElementById('totalAmount').textContent='180元 (基础)';
    document.getElementById('dcAmount').textContent='30元';
    document.getElementById('gfAmount').textContent='80元';
    document.getElementById('thAmount').textContent='70元';
  }else{
    ve.textContent='上涨 '+d.pct+'%，不上弹药';
    ve.className='verdict normal';
    pe.style.display='block';
    document.getElementById('totalAmount').textContent='180元 (基础)';
    document.getElementById('dcAmount').textContent='30元';
    document.getElementById('gfAmount').textContent='80元';
    document.getElementById('thAmount').textContent='70元';
  }
  document.title='纳指 '+(d.pct>=0?'+':'')+d.pct+'%';
}).catch(function(e){
  document.getElementById('status').textContent='加载失败: '+e.message;
});
</script>
</body>
</html>`;

// 创建HTTP服务
const server = http.createServer(function(req, res) {
  if (req.url === '/api/data') {
    // API: 获取纳指数据
    https.get('https://hq.sinajs.cn/list=gb_$ixic', {
      headers: { 'Referer': 'https://finance.sina.com.cn' }
    }, function(sinaRes) {
      let data = '';
      sinaRes.on('data', function(c) { data += c; });
      sinaRes.on('end', function() {
        const m = data.match(/"([^"]+)"/);
        if (!m) {
          res.writeHead(500, {'Content-Type': 'application/json;charset=utf-8'});
          res.end(JSON.stringify({error: '数据解析失败'}));
          return;
        }
        const f = m[1].split(',');
        res.writeHead(200, {
          'Content-Type': 'application/json;charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          close: parseFloat(f[1]).toFixed(2),
          pct: parseFloat(f[2]).toFixed(2),
          change: parseFloat(f[4]).toFixed(2),
          open: parseFloat(f[5]).toFixed(2),
          high: parseFloat(f[6]).toFixed(2),
          low: parseFloat(f[7]).toFixed(2),
          prevClose: parseFloat(f[8]).toFixed(2),
          time: f[3]
        }));
      });
    }).on('error', function(e) {
      res.writeHead(500, {'Content-Type': 'application/json;charset=utf-8'});
      res.end(JSON.stringify({error: e.message}));
    });
  } else {
    // 返回HTML页面
    res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
    res.end(HTML);
  }
});

const PORT = 3000;
const IP = getLocalIP();
server.listen(PORT, '0.0.0.0', function() {
  console.log('========================================');
  console.log('  纳指弹药追踪器 - 服务已启动');
  console.log('========================================');
  console.log('  本机访问: http://localhost:' + PORT);
  console.log('  手机访问: http://' + IP + ':' + PORT);
  console.log('  (手机和电脑需在同一WiFi下)');
  console.log('========================================');
  console.log('  按 Ctrl+C 停止服务');
});
