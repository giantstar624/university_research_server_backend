import express, { Request, Response } from "express"
import axios from "axios"
import path from "path"
import cors from "cors"
import moment from "moment"
import os from 'os';
interface Status {
  [ip: string]: boolean;
}
const networkInterfaces = os.networkInterfaces();
const interfaceName = 'Ethernet';
let myIP = "";
if (networkInterfaces[interfaceName]) {
  for (const net of networkInterfaces[interfaceName]!) {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`Primary IP Address: ${net.address}`);
      myIP = net.address;
      break;
    }
  }
} else {
  console.log(`No such interface: ${interfaceName}`);
}
const rdpInfo = {
  "user": "administrator",
  "password": "mO29pXzn%B2Kf(hwoBM$vOXbpDQ3hoWw"
}
//L4I(wYd)lIzqTJAEmObrL2x!GP3eUvo9
const app = express();
const backendIp = process.env.BACKEND_IP;
//ip:available
const status: Status = { "34.224.109.221": false };
app.use(cors());

app.get("/launch", async (req: Request, res: Response) => {
  for (const ip in status) {
    if (status[ip] == true) {
      status[ip] = false;
      axios.get(`${myIP}/launch`, { params: { id: moment().format('YYYY-MM-DD-HH-mm-ss') } });
      const passwordHash = (await axios.get(`http://${ip}:8001/Myrtille/GetHash.aspx`, { params: { password: rdpInfo.password } })).data;
      res.send({ launched: true, url: encodeURI(`http://${ip}:8001/Myrtille/?__EVENTTARGET=&__EVENTARGUMENT=&server=${ip}&user=${rdpInfo.user}&passwordHash=${passwordHash}&connect=Connect`) });
      return;
    }
  }
  res.send({ launched: false });
});

app.get("/logs", async (req: Request, res: Response) => {
  const result = [];
  for (const ip in status) {
    result.push(...(await axios.get(`http://${ip}:8001/logs`, { params: { id: req.query.id } })).data);
  }
  res.send(result);
});

app.get("/ids", async (req: Request, res: Response) => {
  const result = [];
  for (const ip in status) {
    result.push(...(await axios.get(`http://${ip}:8001/ids`, { params: { id: req.query.id } })).data);
  }
  res.send(result);
})

app.listen(8001, () => {
  console.log("server running on port 8001");
})