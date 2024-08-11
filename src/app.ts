import express, { Request, Response } from "express"
import axios from "axios"
import path from "path"
import cors from "cors"
import moment from "moment"

const rdpInfo = {
  "server": "34.224.109.221",
  "user": "administrator",
  "password": "mO29pXzn%B2Kf(hwoBM$vOXbpDQ3hoWw"
}
//L4I(wYd)lIzqTJAEmObrL2x!GP3eUvo9
const app = express();

const ec2BackendUrl = process.env.EC2_BACKEND_URL;
const backendIp = process.env.BACKEND_IP;

app.use(cors());

app.get("/launch", async (req: Request, res: Response) => {
  axios.get(`${ec2BackendUrl}/launch`, { params: { id: moment().format('YYYY-MM-DD-HH-mm-ss') } });
  const passwordHash = (await axios.get(`http://${backendIp}/Myrtille/GetHash.aspx`, { params: { password: rdpInfo.password } })).data;
  res.redirect(encodeURI(`http://${backendIp}/Myrtille/?__EVENTTARGET=&__EVENTARGUMENT=&server=${rdpInfo.server}&user=${rdpInfo.user}&passwordHash=${passwordHash}&connect=Connect`))
});

app.get("/logs", async (req: Request, res: Response) => {
  res.send((await axios.get(`${ec2BackendUrl}/logs`, { params: { id: req.query.id } })).data);
});

app.get("/ids", async (req: Request, res: Response) => {
  const { data } = await axios.get(`${ec2BackendUrl}/ids`);
  res.send(data);
})

app.listen(8001, () => {
  console.log("server running on port 8001");
})