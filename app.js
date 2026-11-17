// Compound growth calculator: monthly compounding with monthly contributions.
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});

function project(initial, monthly, ratePct, years) {
  const r = ratePct / 100 / 12;
  let balance = initial;
  const points = [balance];
  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + r) + monthly;
    if (m % 12 === 0) points.push(balance);
  }
  const contributed = initial + monthly * years * 12;
  return {balance, contributed, points};
}

function drawChart(points) {
  const c = $('chart'), g = c.getContext('2d');
  const W = c.width, H = c.height, pad = 30;
  g.clearRect(0, 0, W, H);
  const max = Math.max(...points) || 1;
  const x = i => pad + (i / (points.length - 1 || 1)) * (W - pad * 2);
  const y = v => H - pad - (v / max) * (H - pad * 2);
  g.strokeStyle = '#22304d'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yy = pad + i * (H - pad * 2) / 4;
    g.beginPath(); g.moveTo(pad, yy); g.lineTo(W - pad, yy); g.stroke();
  }
  g.beginPath();
  points.forEach((v, i) => i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v)));
  g.strokeStyle = '#3ddc97'; g.lineWidth = 3; g.stroke();
  g.lineTo(x(points.length - 1), H - pad); g.lineTo(x(0), H - pad); g.closePath();
  g.fillStyle = 'rgba(61,220,151,.15)'; g.fill();
  g.fillStyle = '#93a0b8'; g.font = '14px system-ui';
  g.fillText('Year 0', pad, H - 8);
  g.fillText('Year ' + (points.length - 1), W - pad - 55, H - 8);
}

function update() {
  const num = id => Math.max(0, parseFloat($(id).value) || 0);
  const years = Math.min(60, Math.max(1, Math.floor(num('years')) || 1));
  const res = project(num('initial'), num('monthly'), num('rate'), years);
  $('out-final').textContent = fmt(res.balance);
  $('out-contrib').textContent = fmt(res.contributed);
  $('out-growth').textContent = fmt(res.balance - res.contributed);
  drawChart(res.points);
}

document.querySelectorAll('#calc-form input').forEach(i => i.addEventListener('input', update));
$('calc-form').addEventListener('submit', e => e.preventDefault());
$('year').textContent = new Date().getFullYear();
update();
