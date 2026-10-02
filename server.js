const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const robots = [
  { id:'RB-001', name:'Atlas', type:'AMR', status:'online', mode:'patrol', battery:87, temperature:41, speed:1.8, load:62, x:18, y:24, zone:'A-01', uptime:98.7 },
  { id:'RB-002', name:'Bolt', type:'AGV', status:'online', mode:'delivery', battery:64, temperature:45, speed:2.4, load:78, x:44, y:32, zone:'B-03', uptime:96.2 },
  { id:'RB-003', name:'Cargo', type:'AMR', status:'charging', mode:'charge', battery:31, temperature:35, speed:0, load:15, x:78, y:20, zone:'C-02', uptime:91.8 },
  { id:'RB-004', name:'Delta', type:'Inspection', status:'online', mode:'inspection', battery:72, temperature:53, speed:1.2, load:38, x:67, y:68, zone:'D-04', uptime:94.5 },
  { id:'RB-005', name:'Echo', type:'AGV', status:'offline', mode:'stopped', battery:19, temperature:29, speed:0, load:0, x:25, y:72, zone:'E-01', uptime:87.1 },
  { id:'RB-006', name:'Falcon', type:'AMR', status:'online', mode:'delivery', battery:91, temperature:48, speed:2.0, load:55, x:86, y:78, zone:'F-02', uptime:99.1 }
];

let alerts = [
  {id:1, robotId:'RB-004', severity:'warning', title:'High temperature', message:'Motor temperature reached 53°C.', time:Date.now()-180000, acknowledged:false},
  {id:2, robotId:'RB-003', severity:'info', title:'Low battery', message:'Robot is charging at 31%.', time:Date.now()-420000, acknowledged:false},
  {id:3, robotId:'RB-005', severity:'danger', title:'Robot offline', message:'No telemetry received from Echo.', time:Date.now()-900000, acknowledged:false}
];
let nextAlertId = 4;
const history = Object.fromEntries(robots.map(r => [r.id, []]));

function snapshot(r) { return {time:Date.now(), battery:r.battery, temperature:r.temperature, speed:r.speed, load:r.load}; }
robots.forEach(r => { for(let i=14;i>=0;i--) history[r.id].push({time:Date.now()-i*3000, battery:r.battery, temperature:r.temperature, speed:r.speed, load:r.load}); });

function makeAlert(robot, severity, title, message) {
  const recent = alerts.find(a => a.robotId===robot.id && a.title===title && !a.acknowledged && Date.now()-a.time<60000);
  if (!recent) alerts.unshift({id:nextAlertId++, robotId:robot.id, severity, title, message, time:Date.now(), acknowledged:false});
}

setInterval(() => {
  robots.forEach(r => {
    if (r.status === 'online') {
      r.speed = Math.max(0, Math.min(3, r.speed + (Math.random()-.5)*.35));
      r.load = Math.max(0, Math.min(100, r.load + (Math.random()-.5)*5));
      r.temperature = Math.max(28, Math.min(70, r.temperature + (Math.random()-.48)*2));
      r.battery = Math.max(5, r.battery - Math.random()*.35);
      r.x = Math.max(8, Math.min(92, r.x + (Math.random()-.5)*5));
      r.y = Math.max(10, Math.min(90, r.y + (Math.random()-.5)*5));
    } else if (r.status === 'charging') {
      r.battery = Math.min(100, r.battery + .9);
      r.temperature = Math.max(27, r.temperature + (Math.random()-.5)*.5);
      r.speed = 0;
      if (r.battery >= 98) { r.status='online'; r.mode='patrol'; }
    }
    if (r.battery < 20 && r.status === 'online') makeAlert(r,'danger','Critical battery',`${r.name} battery is below 20%.`);
    else if (r.battery < 35 && r.status === 'online') makeAlert(r,'warning','Low battery',`${r.name} battery is below 35%.`);
    if (r.temperature > 55) makeAlert(r,'danger','Critical temperature',`${r.name} temperature reached ${r.temperature.toFixed(1)}°C.`);
    else if (r.temperature > 50) makeAlert(r,'warning','High temperature',`${r.name} temperature reached ${r.temperature.toFixed(1)}°C.`);
    history[r.id].push(snapshot(r));
    if(history[r.id].length>40) history[r.id].shift();
  });
},3000);

app.get('/api/dashboard', (req,res) => {
  const active = robots.filter(r=>r.status==='online').length;
  const charging = robots.filter(r=>r.status==='charging').length;
  const avgBattery = robots.reduce((s,r)=>s+r.battery,0)/robots.length;
  const avgTemp = robots.reduce((s,r)=>s+r.temperature,0)/robots.length;
  res.json({robots, alerts, stats:{total:robots.length, active, charging, offline:robots.length-active-charging, avgBattery, avgTemp}});
});
app.get('/api/robots/:id', (req,res) => { const r=robots.find(x=>x.id===req.params.id); r ? res.json(r) : res.status(404).json({error:'Robot not found'}); });
app.get('/api/robots/:id/history', (req,res) => { history[req.params.id] ? res.json(history[req.params.id]) : res.status(404).json({error:'Robot not found'}); });
app.post('/api/robots/:id/action', (req,res) => {
  const r=robots.find(x=>x.id===req.params.id); if(!r) return res.status(404).json({error:'Robot not found'});
  const action=req.body.action;
  if(action==='start'){r.status='online';r.mode='patrol';}
  else if(action==='stop'){r.status='offline';r.mode='stopped';r.speed=0;}
  else if(action==='charge'){r.status='charging';r.mode='charge';r.speed=0;}
  else if(action==='reset'){r.battery=100;r.temperature=30;r.status='online';r.mode='patrol';}
  else return res.status(400).json({error:'Invalid action'});
  res.json(r);
});
app.post('/api/alerts/:id/ack', (req,res) => { const a=alerts.find(x=>x.id===Number(req.params.id)); if(!a)return res.status(404).json({error:'Alert not found'}); a.acknowledged=true; res.json(a); });
app.delete('/api/alerts/acknowledged',(req,res)=>{alerts=alerts.filter(a=>!a.acknowledged);res.json({success:true});});
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT,()=>console.log(`Robot Monitoring Platform running at http://localhost:${PORT}`));
