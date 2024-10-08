import express, { Request, Response } from "express"
import axios from "axios"
import cors from "cors"
import moment from "moment"
import awsUtil from './aws'
import { error } from "console"
const METADATA_URL = 'http://169.254.169.254/latest/meta-data';
const TOKEN_URL = 'http://169.254.169.254/latest/api/token';

// Function to get the metadata service token
async function getToken(): Promise<string> {
  try {
    const response = await axios.put(TOKEN_URL, null, {
      headers: {
        'X-aws-ec2-metadata-token-ttl-seconds': '21600'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching metadata token:', error);
    throw error;
  }
}

// Function to get metadata using the token
async function getMetadata(path: string, token: string): Promise<string> {
  try {
    const response = await axios.get(`${METADATA_URL}/${path}`, {
      headers: {
        'X-aws-ec2-metadata-token': token
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching metadata from path ${path}:`, error);
    throw error;
  }
}

// Main function to get IP addresses
async function getIpAddresses() {
  try {
    // Fetch the token
    const token = await getToken();

    // Fetch the public and private IP addresses
    return await getMetadata('public-ipv4', token);
  } catch (error) {
    console.error('Error retrieving IP addresses:', error);
    return "";
  }
}
async function getAgentStatus() {
  const ipAddresses = await awsUtil.getInstanceIPsByTag("Name", "MyInstance")
  const requests = ipAddresses.map(async (ip) => {
    try {
      const response = await axios.get(`http://${ip}:8001/status`, { timeout: 5000 });
      return { ip, status: response.data };
    } catch (error) {
      // console.error(`Error fetching data from ${ip}:`, error);
      return { ip, status: "noresponse" };
    }
  });
  // Wait for all requests to complete
  const results = await Promise.allSettled(requests);
  const newAgentStatus = new Map<string, string>();
  results.forEach((result: any) => {
    const { ip, status } = result.value;
    newAgentStatus.set(ip, status);
  });
  return newAgentStatus;
}

const endList: any = [];
getIpAddresses().then(async (myIP) => {
  console.log(`my address is ${myIP}`)
  const rdpInfo = {
    "user": process.env.RDP_USER,
    "password": process.env.RDP_PASSWORD
  }
  //L4I(wYd)lIzqTJAEmObrL2x!GP3eUvo9
  const app = express();
  let agentStatus = new Map<string, string>();
  agentStatus = await getAgentStatus();
  // agentStatus.set("34.224.109.221", "disconnected");
  //ip:available
  setInterval(async () => {
    agentStatus = await getAgentStatus();
    // agentStatus.set("34.224.109.221", "disconnected");
  }, 10000)
  app.use(cors());

  app.get("/launch", async (req: Request, res: Response) => {
    for (const ip of agentStatus.keys())
      if (agentStatus.get(ip) == "disconnected") {
        agentStatus.set(ip, "connected");
        try {
          const result = (await axios.get(`http://${ip}:8001/status`)).data;
          if (result == "disconnected") {
            await axios.get(`http://${ip}:8001/launch`, { params: { id: moment().format('YYYY-MM-DD-HH-mm-ss') } });
            const passwordHash = (await axios.get(`http://${myIP}/Myrtille/GetHash.aspx`, { params: { password: rdpInfo.password } })).data;
            res.send({ launched: true, url: encodeURI(`http://${myIP}/Myrtille/?__EVENTTARGET=&__EVENTARGUMENT=&server=${ip}&user=${rdpInfo.user}&passwordHash=${passwordHash}&connect=Connect`) });
            return;
          }
        } catch (error) {
          console.log(error);
          agentStatus.set(ip, "noresponse");
        }
      }
    res.send({ launched: false });
  });

  app.get("/end", async (req: Request, res: Response) => {
    const { duration, startTime, endTime } = req.query;
    console.log({ duration, startTime, endTime });
    endList.push({ duration: duration as string, startTime: startTime as string, endTime: endTime as string });
    res.send("Awesome");
  });
  app.get("/endlist", async (req: Request, res: Response) => {
    res.send(endList);
  })

  app.get("/logs", async (req: Request, res: Response) => {
    if (typeof (req.query.id) != 'string') return;
    const index = req.query.id.indexOf('_');
    console.log(req.query.id.substring(index + 1));

    res.send((await axios.get(`http://${req.query.id.substring(0, index)}:8001/logs`, { params: { id: req.query.id.substring(index + 1) } })).data);
  });
  app.get("/logoff", (req: Request, res: Response) => {
    agentStatus.set(req.query.ip as string, "disconnected")
    res.send("ok")
  })

  app.get("/create_instance", async (req: Request, res: Response) => {
    const cnt = req.query.cnt;
    if (typeof (cnt) == 'string')
      awsUtil.run(parseInt(cnt));
    res.send({ success: true });
  })
  app.get("/ids", async (req: Request, res: Response) => {
    try {
      // Create an array of promises for the parallel HTTP requests
      const requests = Array.from(agentStatus.keys()).map(async (ip) => {
        try {
          const response = await axios.get(`http://${ip}:8001/ids`, { timeout: 5000 });
          return { ip, data: response.data };
        } catch (error) {
          console.error(`Error fetching data from ${ip}:`, error);
          return { ip, data: [] };
        }
      });

      // Wait for all requests to complete
      const results = await Promise.allSettled(requests);
      // Process results
      const result = results.reduce((acc, result: any) => {
        const { ip, data } = result.value
        acc[ip] = data;
        return acc;
      }, {} as Record<string, any>);
      res.json(result);
    } catch (error) {
      console.error('Error in processing requests:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  app.get("/status", async (req: Request, res: Response) => {
    let countInResearch = 0, countNoReponse = 0;
    const requests = Array.from(agentStatus.keys()).map(async (ip) => {
      try {
        const response = await axios.get(`http://${ip}:8001/status`, { timeout: 5000 });
        return { status: response.data };
      } catch (error) {
        console.error(`Error fetching data from ${ip}:`, error);
        return { status: "noresponse" };
      }
    });
    // Wait for all requests to complete
    const results = await Promise.allSettled(requests);
    results.forEach((result: any) => {
      const { status } = result.value
      if (status == "connected")
        countInResearch++;
      else if (status == "noresponse")
        countNoReponse++;
    });
    res.json({ total: agentStatus.size, inResearch: countInResearch, noResponse: countNoReponse });
  });

  app.listen(8001, () => {
    console.log("server running on port 8001");
  })
})
  .catch((error) => {
    console.error('Error retrieving IP addresses:', error);
  });
