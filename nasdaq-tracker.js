/**
 * 纳斯达克定投弹药追踪器
 *
 * Plan B:
 *   - 基础档: 180元/日（大成30 + 广发80 + 天弘70）
 *   - 弹药档: 70元/日，纳指跌超阈值时手动加仓
 *
 * 用法: node nasdaq-tracker.js
 * 每天上午（北京时间9:00-15:00）跑一次，看要不要打弹药
 */

const http = require('http');

// ===== 配置 =====
const CONFIG = {
  dropThreshold: 1.5,    // 跌幅阈值（%）
  ammoPerDay: 70,        // 弹药金额
  basePerDay: 180,       // 基础定投
};

// ===== 用新浪财经获取纳指数据（国内可访问） =====
function fetchFromSina() {
  return new Promise((resolve, reject) => {
    // gb_$ixic = 纳斯达克综合, gb_$ndx = 纳斯达克100
    const url = 'http://hq.sinajs.cn/list=gb_$ixic';

    http.get(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (!data || data.includes('hq_str_') === false) {
          reject(new Error('无效数据'));
          return;
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

// ===== 解析新浪数据 =====
function parseSinaData(raw) {
  // 格式: var hq_str_gb_$ixic="名称,现价,涨跌幅%,时间,涨跌额,开盘,最高,最低,昨收,...";
  const match = raw.match(/"([^"]+)"/);
  if (!match) return null;

  const fields = match[1].split(',');
  if (fields.length < 9) return null;

  const name = fields[0];
  const close = parseFloat(fields[1]);
  const changePct = parseFloat(fields[2]);    // 涨跌幅（%）
  const changeVal = parseFloat(fields[4]);     // 涨跌额
  const open = parseFloat(fields[5]);
  const high = parseFloat(fields[6]);
  const low = parseFloat(fields[7]);
  const prevClose = parseFloat(fields[8]);

  // 简单校验
  if (isNaN(close) || isNaN(changePct)) return null;

  return { name, close, changePct, changeVal, open, high, low, prevClose };
}

// ===== 判断今天是不是交易日 =====
function isTradingDay() {
  const d = new Date();
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

// ===== 主逻辑 =====
async function main() {
  console.log('========================================');
  console.log('  纳斯达克弹药追踪器');
  console.log('========================================');
  console.log('  跌幅阈值: ' + CONFIG.dropThreshold + '%');
  console.log('  基础定投: ' + CONFIG.basePerDay + '元/日');
  console.log('  弹药: ' + CONFIG.ammoPerDay + '元/日');
  console.log('  分配: 大成+20 | 广发+20 | 天弘+30');
  console.log('========================================\n');

  if (!isTradingDay()) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    console.log('  (今天周' + days[new Date().getDay()] + '，非交易日，跳过)');
    console.log('');
    return;
  }

  console.log('正在获取纳斯达克数据...');
  const raw = await fetchFromSina();
  const data = parseSinaData(raw);

  if (!data) {
    console.log('\n⚠️ 获取数据失败，手工判断:');
    console.log('  打开 http://hq.sinajs.cn/list=gb_$ixic');
    console.log('  看第3个字段（涨跌幅），超过 1.5% 就打弹药');
    console.log('');
    return;
  }

  const icon = data.changePct >= 0 ? '+' : '';
  console.log('纳斯达克: ' + data.close.toFixed(2) + ' 点');
  console.log('涨跌: ' + icon + data.changePct.toFixed(2) + '%');

  if (data.changePct < 0 && Math.abs(data.changePct) >= CONFIG.dropThreshold) {
    var ammoTotal = CONFIG.basePerDay + CONFIG.ammoPerDay;
    console.log('\n🔔 触发弹药! 跌了 ' + Math.abs(data.changePct).toFixed(1) + '%');
    console.log('  今日投入: 基础 ' + CONFIG.basePerDay + ' + 弹药 ' + CONFIG.ammoPerDay + ' = ' + ammoTotal + '元');
    console.log('  操作: 大成 50 | 广发 100 | 天弘 100 (全部打满)');
  } else if (data.changePct < 0) {
    console.log('\n跌了 ' + Math.abs(data.changePct).toFixed(1) + '%，未达阈值。弹药留着。');
    console.log('  今日投入: 基础 ' + CONFIG.basePerDay + '元（大成30 + 广发80 + 天弘70）');
  } else {
    console.log('\n上涨 ' + data.changePct.toFixed(2) + '%，不触发。');
    console.log('  今日投入: 基础 ' + CONFIG.basePerDay + '元（大成30 + 广发80 + 天弘70）');
  }

  console.log('');
  console.log('--- 快照 ---');
  console.log('  时间: ' + new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}));
  console.log('  纳指: ' + data.close.toFixed(2) + ' | ' + icon + data.changePct.toFixed(2) + '%');
  console.log('  预算: 10,000元');
  console.log('========================================');
}

main().catch(function(err) {
  console.log('出错: ' + err.message);
  console.log('\n手工判断: 打开 http://hq.sinajs.cn/list=gb_$ixic');
  console.log('第3个字段是涨跌幅，超 1.5% 就打弹药');
});
