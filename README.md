# Robot Monitoring Platform

A full-stack robot monitoring dashboard using HTML5, CSS3, Bootstrap 5, vanilla JavaScript, Node.js and Express.js.

## Features
- Live simulated telemetry for six robots
- Fleet status and health overview
- Interactive warehouse map with robot locations
- Battery, temperature, speed and load monitoring
- Live telemetry chart with Chart.js
- Automatic low-battery and temperature alerts
- Alert acknowledgement
- Remote Start, Stop, Charge and Reset controls
- Responsive Bootstrap interface
- REST API for dashboard, robots, history, actions and alerts

## Run
```bash
npm install
npm start
```
Open **http://localhost:3000**.

For development:
```bash
npm run dev
```

## API
- `GET /api/dashboard`
- `GET /api/robots/:id`
- `GET /api/robots/:id/history`
- `POST /api/robots/:id/action` with `{ "action": "start|stop|charge|reset" }`
- `POST /api/alerts/:id/ack`
- `DELETE /api/alerts/acknowledged`

This project uses simulated data and does not require a database or external robot hardware.
